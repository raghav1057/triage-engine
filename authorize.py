from google_auth_oauthlib.flow import InstalledAppFlow
import json

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify"
]

flow = InstalledAppFlow.from_client_secrets_file("oauth-credentials.json", SCOPES)
creds = flow.run_local_server(port=0)

# Save the token for future use
with open("token.json", "w") as f:
    f.write(creds.to_json())

print("Authorization successful. token.json saved.")