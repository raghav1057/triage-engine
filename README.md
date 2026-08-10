# Triage Engine

An automated pipeline that ingests raw customer text (support emails, tickets, feedback), classifies and summarizes it using an LLM, and writes structured results back to a live data source — running on a fully serverless, scheduled basis with no manual intervention required.

## What it does

1. **Ingests** raw text rows from a Google Sheet (`ID`, `Raw Text`, `Status`)
2. **Processes** each row through an LLM (Groq / Llama 3.1), which returns a structured JSON response containing:
   - A one-line summary
   - A category (`bug`, `praise`, `complaint`, `other`)
3. **Writes back** the summary, category, and an updated status directly into the sheet
4. **Runs automatically** every hour via GitHub Actions — no local machine, server, or manual trigger required

## Architecture

```
Google Sheet (input)
      │
      ▼
GitHub Actions (scheduled, hourly)
      │
      ▼
Python script (main.py)
   ├── Authenticates via a Google Service Account
   ├── Reads rows via gspread
   ├── Sends each row's text to Groq's LLM API
   └── Writes summary + category + status back to the sheet
```

## Tech stack

| Component | Tool |
|---|---|
| Language | Python |
| LLM inference | Groq API (Llama 3.1 8B Instant) |
| Data source | Google Sheets (via `gspread` + service account auth) |
| Automation / scheduling | GitHub Actions (cron-based, serverless) |
| Secrets management | GitHub Encrypted Secrets |
| Version control | Git / GitHub |

## Why this design

- **Serverless by default** — no infrastructure to maintain or pay for when idle; GitHub provisions a temporary Linux VM per run and tears it down afterward
- **Secrets never touch the codebase** — API keys and service account credentials are injected at runtime via GitHub Secrets, never committed to source control
- **Environment-agnostic credential loading** — the same script runs identically locally (reading a local JSON file) and in CI/CD (reading an environment variable), with zero code branching required beyond a single fallback check
- **Structured LLM output** — the model is constrained via a system prompt to return strict JSON, making the AI's output directly consumable by downstream code without brittle string-parsing

## Setup

1. Clone this repo
2. Create a `.env` file locally with:
   ```
   GROQ_API_KEY=your_key_here
   ```
3. Create a Google Cloud service account with Sheets + Drive API access, download its JSON key as `service-account.json` (gitignored, never committed)
4. Share your target Google Sheet with the service account's email
5. Install dependencies: `pip install -r requirements.txt`
6. Run locally: `python main.py`

For automated runs, add `GROQ_API_KEY` and `GOOGLE_SERVICE_ACCOUNT` (the full JSON key contents) as GitHub repository secrets — the workflow in `.github/workflows/run-triage.yml` picks them up automatically.

## Roadmap

- [ ] Gmail integration — ingest directly from an inbox instead of a manually maintained sheet
- [ ] Notifications — Slack/email alert when a row is classified as `bug`
- [ ] Batch writes to reduce API calls (currently one write per cell per row)
- [ ] Swap `.env`/service-account-file fallback for a unified secrets abstraction as the project scales

## License

See `LICENSE`.
