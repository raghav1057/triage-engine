import os
import json
import base64
import re
import email.mime.text as mime_text
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials
from google.oauth2.credentials import Credentials as OAuthCredentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from groq import Groq

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key)

# ---- Groq LLM call ----
def call_gemini(prompt):
    system_instructions = (
        "You are a support ticket triage assistant. "
        "Given a piece of raw customer text, respond with ONLY a JSON object "
        "in this exact format: {\"summary\": \"...\", \"category\": \"bug|praise|complaint|other\"}. "
        "The summary should be one short sentence. Do not include any text outside the JSON."
    )
    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_instructions},
            {"role": "user", "content": prompt}
        ]
    )
    raw_output = response.choices[0].message.content
    try:
        result = json.loads(raw_output)
    except json.JSONDecodeError:
        result = {"summary": raw_output[:100], "category": "other"}
    return result

# ---- Gmail auth ----
def get_gmail_service():
    gmail_token_env = os.getenv("GMAIL_TOKEN")
    GMAIL_SCOPES = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send"
    ]
    if gmail_token_env:
        token_data = json.loads(gmail_token_env)
        creds = OAuthCredentials.from_authorized_user_info(token_data, GMAIL_SCOPES)
    else:
        creds = OAuthCredentials.from_authorized_user_file("token.json", GMAIL_SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        if not gmail_token_env:
            with open("token.json", "w") as f:
                f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)

# ---- Clean email body ----
def clean_email_body(text):
    text = re.sub(r"(?m)^>.*$", "", text)
    text = re.sub(r"(?mi)^(--|__|\*\*|regards|thanks|sincerely|sent from).*$", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    words = text.split()
    if len(words) > 300:
        text = " ".join(words[:300]) + "..."
    return text

# ---- Fetch new emails since last run ----
def get_new_emails(service, since_timestamp):
    after = int(since_timestamp.timestamp())
    query = f"after:{after} -label:triaged"
    results = service.users().messages().list(userId="me", q=query).execute()
    messages = results.get("messages", [])
    emails = []
    for msg in messages:
        full = service.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        subject = headers.get("Subject", "(no subject)")
        sender = headers.get("From", "(unknown)")
        body = ""
        payload = full["payload"]
        if "parts" in payload:
            for part in payload["parts"]:
                if part["mimeType"] == "text/plain":
                    data = part["body"].get("data", "")
                    body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                    break
        elif "body" in payload:
            data = payload["body"].get("data", "")
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        emails.append({
            "id": msg["id"],
            "subject": subject,
            "sender": sender,
            "body": clean_email_body(body)
        })
    return emails

# ---- Add Gmail label ----
def apply_triaged_label(service, message_id, label_id):
    service.users().messages().modify(
        userId="me",
        id=message_id,
        body={"addLabelIds": [label_id]}
    ).execute()

# ---- Get or create the triaged label ----
def get_or_create_label(service, label_name="triaged"):
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    for label in labels:
        if label["name"].lower() == label_name.lower():
            return label["id"]
    new_label = service.users().labels().create(
        userId="me",
        body={"name": label_name, "labelListVisibility": "labelShow", "messageListVisibility": "show"}
    ).execute()
    return new_label["id"]

# ---- Send bug alert email ----
def send_bug_alert(service, sender_email, subject, summary):
    alert_to = "projectmailtest01@gmail.com"
    alert_subject = f"Bug Alert: {subject}"
    alert_body = f"""A new email has been classified as a bug.

From: {sender_email}
Subject: {subject}
Summary: {summary}

Check the triage sheet for full details.
"""
    message = mime_text.MIMEText(alert_body)
    message["to"] = alert_to
    message["subject"] = alert_subject
    encoded = base64.urlsafe_b64encode(message.as_bytes()).decode()
    service.users().messages().send(
        userId="me",
        body={"raw": encoded}
    ).execute()
    print(f"Bug alert sent to {alert_to}")

# ---- Sender blocklist ----
BLOCKED_SENDERS = [
    "no-reply", "noreply", "donotreply", "do-not-reply",
    "notifications", "newsletter", "mailer-daemon",
    "automated", "hello@", "info@",
    "github"  # block GitHub notification emails
]

def is_blocked_sender(sender):
    sender_lower = sender.lower()
    return any(blocked in sender_lower for blocked in BLOCKED_SENDERS)

# ---- Google Sheets auth ----
SHEETS_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]
service_account_env = os.getenv("GOOGLE_SERVICE_ACCOUNT")
if service_account_env:
    service_account_info = json.loads(service_account_env)
    creds = Credentials.from_service_account_info(service_account_info, scopes=SHEETS_SCOPES)
else:
    creds = Credentials.from_service_account_file("service-account.json", scopes=SHEETS_SCOPES)

sheets_client = gspread.authorize(creds)
sheet = sheets_client.open("triage-engine-input").sheet1

# ---- Read last run timestamp from sheet (cell H1) ----
last_run_raw = sheet.acell("H1").value
if last_run_raw:
    last_run = datetime.fromisoformat(last_run_raw).replace(tzinfo=timezone.utc)
else:
    last_run = datetime.now(timezone.utc) - timedelta(hours=24)

# ---- Run Gmail pipeline ----
gmail_service = get_gmail_service()
label_id = get_or_create_label(gmail_service)
emails = get_new_emails(gmail_service, last_run)

print(f"Found {len(emails)} new emails since last run.")

for email in emails:
    if is_blocked_sender(email["sender"]):
        print(f"Skipped (blocked sender): {email['sender']}")
        apply_triaged_label(gmail_service, email["id"], label_id)
        continue

    result = call_gemini(email["body"] or email["subject"])
    print(f"[{result['category']}] {email['subject']} — {result['summary']}")

    sheet.append_row([
        email["sender"],
        email["subject"],
        email["body"][:200],
        result["category"],
        result["summary"],
        "processed"
    ])

    if result["category"] == "bug":
        send_bug_alert(gmail_service, email["sender"], email["subject"], result["summary"])

    apply_triaged_label(gmail_service, email["id"], label_id)

# ---- Update last run timestamp ----
sheet.update_acell("H1", datetime.now(timezone.utc).isoformat())
print("Done. Timestamp updated.")