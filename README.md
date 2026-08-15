# Triage Engine

An automated pipeline that ingests emails from a Gmail inbox, classifies and summarizes them using an LLM, logs structured results to a Google Sheet, and labels processed emails in Gmail — running on a fully serverless, scheduled basis with no manual intervention required.

## What it does

1. **Ingests** new emails from a Gmail inbox since the last run
2. **Cleans** each email body — strips reply chains, signatures, and truncates to 500 words
3. **Processes** each email through an LLM (Groq / Llama 3.1), which returns:
   - A one-line summary
   - A category (`bug`, `praise`, `complaint`, `other`)
4. **Logs** results to a Google Sheet (sender, subject, body snippet, category, summary, status)
5. **Labels** each processed email as "triaged" in Gmail so it's never processed twice
6. **Updates** a timestamp in the sheet so each run only picks up genuinely new emails
7. **Runs automatically** every hour via GitHub Actions — no local machine, server, or manual trigger required

## Architecture
Gmail Inbox (new emails since last run)
│
▼
GitHub Actions (scheduled, hourly)
│
▼
Python script (main.py)
├── Authenticates to Gmail via OAuth2 (token stored as GitHub Secret)
├── Fetches and cleans new emails
├── Sends each email body to Groq's LLM API
├── Appends results to Google Sheet via service account
├── Labels email as "triaged" in Gmail
└── Updates last-run timestamp in sheet

## Tech stack

| Component | Tool |
|---|---|
| Language | Python |
| Email source | Gmail API (OAuth2) |
| LLM inference | Groq API (Llama 3.1 8B Instant) |
| Data logging | Google Sheets (via `gspread` + service account) |
| Automation | GitHub Actions (cron-based, serverless) |
| Secrets management | GitHub Encrypted Secrets |
| Version control | Git / GitHub |

## Auth design

Two different auth patterns are used deliberately:

- **Google Sheets** uses a service account — a robot identity with its own credentials, suitable for accessing a specific shared resource without a human login
- **Gmail** uses OAuth2 — the standard pattern for accessing a personal inbox, where a human authorizes access once via a browser and the resulting token is reused silently for all future runs

Both credential sources follow the same fallback pattern: check for an environment variable first (used in GitHub Actions), fall back to a local file (used in local development). The same code runs identically in both environments.

## Setup

1. Clone this repo
2. Create a `.env` file locally:
3. Create a Google Cloud project, enable Sheets, Drive, and Gmail APIs
4. Create a service account with Sheets + Drive access, download key as `service-account.json`
5. Share your Google Sheet with the service account email
6. Create an OAuth2 Desktop App credential, download as `oauth-credentials.json`
7. Run `python authorize.py` once to generate `token.json` via browser login
8. Install dependencies: `pip install -r requirements.txt`
9. Run locally: `python main.py`

For automated runs, add these three GitHub repository secrets:
- `GROQ_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT` (full contents of `service-account.json`)
- `GMAIL_TOKEN` (full contents of `token.json`)

## Roadmap

- [ ] Slack or email alert when a `bug` is detected
- [ ] Sender-based filtering — skip newsletters, no-reply addresses
- [ ] Batch cell writes to reduce Sheets API calls
- [ ] Support for HTML email bodies (currently plain text only)
- [ ] Dashboard view of category breakdown over time

## License

See `LICENSE`.