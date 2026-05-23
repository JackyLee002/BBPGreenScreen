import os
import sys
from anthropic import Anthropic, APIStatusError, AuthenticationError

key = os.environ.get("ANTHROPIC_API_KEY")
if not key:
    print("[FAIL] ANTHROPIC_API_KEY not found in environment")
    sys.exit(1)

print(f"[OK] Key loaded from env (length={len(key)}, prefix={key[:10]}...)")

client = Anthropic()

try:
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=20,
        messages=[{"role": "user", "content": "Reply with exactly: PONG"}],
    )
    print(f"[OK] API call succeeded")
    print(f"     Model:    {resp.model}")
    print(f"     Reply:    {resp.content[0].text}")
    print(f"     Tokens:   in={resp.usage.input_tokens}, out={resp.usage.output_tokens}")
except AuthenticationError as e:
    print(f"[FAIL] Auth error - key is invalid or revoked: {e}")
    sys.exit(1)
except APIStatusError as e:
    print(f"[FAIL] API error (status {e.status_code}): {e.message}")
    sys.exit(1)
