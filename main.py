import os
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials

# Load the API key from .env file
load_dotenv()

# Read the API key from environment
api_key = os.getenv("GEMINI_API_KEY")

def call_gemini(prompt):
    # MOCK RESPONSE - replace with real API call once quota resets
    # Real code will be:
    # from google import genai
    # client = genai.Client(api_key=api_key)
    # response = client.models.generate_content(model="gemini-2.0-flash-lite", contents=prompt)
    # return response.text

    text =  prompt.lower()
    if "crash" in text or "fix" in text:
        category = "Bug"
    elif "love" in text or "amazing" in text:
        category = "praise"
    elif "waiting" in text or "refund" in text:
        category = "complaint"
    else:
        category = "other"

    mock_summary = "Auto-generated summary placeholder for:" + prompt[:40] + "..."
    return {"summary": mock_summary, "category": category}

# Test the function
result = call_gemini("Say hello and tell me what you can do in 2 sentences.")
print(result)

# ---- Phase 2: read from Google Sheet ----
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

creds = Credentials.from_service_account_file("service-account.json", scopes = SCOPES)
client = gspread.authorize(creds)
sheet = client.open("triage-engine-input").sheet1
records = sheet.get_all_records()

# ---- Phase 3: process each row through Gemini ----
# ---- Phase 4: process each row and write results back ----
for i, row in enumerate(records, start=2):  # start=2 because row 1 is headers
    raw_text = row["Raw Text"]
    result = call_gemini(raw_text)

    print(f"ID {row['ID']}: [{result['category']}] {result['summary']}")

    # Write category, summary, and status back to the sheet
    sheet.update_cell(i, 4, result["category"])   # column D
    sheet.update_cell(i, 5, result["summary"])     # column E
    sheet.update_cell(i, 3, "processed")           # column C (Status)