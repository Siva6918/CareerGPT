"""
Test OpenAI and Gemini providers directly
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv(".env")

async def test_providers():
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    # 1. Test Gemini
    print("Testing Gemini...")
    try:
        from llm.provider import GeminiProvider
        gemini = GeminiProvider(api_key=gemini_key, model="gemini-1.5-flash")
        resp = await gemini.complete([{"role": "user", "content": "Reply with only 'GEMINI_OK'"}])
        print(f"[RESULT] Gemini response: {resp.content.strip()[:60]} (model={resp.model}, provider={resp.provider})")
    except Exception as e:
        print(f"[FAIL] Gemini error: {type(e).__name__}: {e}")

    # 2. Test OpenAI
    print("Testing OpenAI...")
    try:
        from llm.provider import OpenAIProvider
        openai_p = OpenAIProvider(api_key=openai_key, model="gpt-4o-mini")
        resp_o = await openai_p.complete([{"role": "user", "content": "Reply with only 'OPENAI_OK'"}])
        print(f"[RESULT] OpenAI response: {resp_o.content.strip()[:60]} (model={resp_o.model}, provider={resp_o.provider})")
    except Exception as e:
        print(f"[FAIL] OpenAI error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_providers())
