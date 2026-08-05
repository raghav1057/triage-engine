import os
from dotenv import load_dotenv

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

    mock_response = """
    Hello! I'm Gemini, Google's AI model. 
    I can help you summarize text, classify data, answer questions, 
    write code, and much more.
    """
    return mock_response

# Test the function
result = call_gemini("Say hello and tell me what you can do in 2 sentences.")
print(result)