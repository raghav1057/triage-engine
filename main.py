import os
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials
from groq import Groq
import json

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key)

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

# ---- Phase 2: read from Google Sheet ----
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

# If running on GitHub Actions, the credentials come from a secret (a string).
# If running locally, we fall back to the local JSON file.
service_account_env = os.getenv("GOOGLE_SERVICE_ACCOUNT")

if service_account_env:
    service_account_info = json.loads(service_account_env)
    creds = Credentials.from_service_account_info(service_account_info, scopes=SCOPES)
else:
    creds = Credentials.from_service_account_file("service-account.json", scopes=SCOPES)

client = gspread.authorize(creds)
sheet = client.open("triage-engine-input").sheet1
records = sheet.get_all_records()

# ---- Phase 3 & 4: classify each row and write results back ----
for i, row in enumerate(records, start=2):
    raw_text = row["Raw Text"]
    result = call_gemini(raw_text)

    print(f"ID {row['ID']}: [{result['category']}] {result['summary']}")

    sheet.update_cell(i, 4, result["category"])
    sheet.update_cell(i, 5, result["summary"])
    sheet.update_cell(i, 3, "processed")