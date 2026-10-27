"""Small helper to call Groq and always get JSON back."""
import os
import json
from groq import Groq

# MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
_client = None


def ask_json(system_prompt: str, user_prompt: str) -> dict:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = _client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},  # forces valid JSON
        temperature=0.2,  # low = more factual, less creative
    )
    return json.loads(response.choices[0].message.content)
