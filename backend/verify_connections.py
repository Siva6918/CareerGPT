"""
Production Connection Verification Script
Tests PostgreSQL, Supabase, Gemini, and OpenAI without exposing any credentials.
"""
import sys
import os

from dotenv import load_dotenv
load_dotenv(".env")

def test_postgresql():
    try:
        from database.connection import engine, init_db
        with engine.connect() as conn:
            from sqlalchemy import text
            res = conn.execute(text("SELECT version();")).fetchone()
            print(f"[PASS] PostgreSQL Connection successful: {res[0][:40]}...")
        # Initialize tables
        init_db()
        print("[PASS] Database tables created/verified on Supabase PostgreSQL.")
        return True
    except Exception as e:
        print(f"[FAIL] PostgreSQL Connection failed: {type(e).__name__}: {str(e)[:120]}")
        return False

def test_supabase():
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SECRET_KEY")
        if not url or not key:
            print("[FAIL] Supabase: URL or Secret Key missing in environment")
            return False
        from supabase import create_client
        client = create_client(url, key)
        # Check buckets or list buckets
        buckets = client.storage.list_buckets()
        bucket_names = [b.name for b in buckets] if buckets else []
        print(f"[PASS] Supabase Storage client connected. Buckets found: {bucket_names}")
        
        # Ensure our required buckets exist or create them
        for target in ["career-resumes", "interview-audio", "interview-video", "user-documents"]:
            if target not in bucket_names:
                try:
                    client.storage.create_bucket(target, options={"public": False})
                    print(f"[PASS] Created private bucket: {target}")
                except Exception as be:
                    print(f"[INFO] Bucket {target} create note: {be}")
            else:
                print(f"[PASS] Verified private bucket: {target}")
        return True
    except Exception as e:
        print(f"[FAIL] Supabase client failed: {type(e).__name__}: {str(e)[:120]}")
        return False

def test_gemini():
    try:
        import asyncio
        from llm.provider import GeminiProvider
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            print("[FAIL] Gemini: GEMINI_API_KEY missing in environment")
            return False
        gemini = GeminiProvider(api_key=key, model="gemini-flash-latest")
        resp = asyncio.run(gemini.complete([{"role": "user", "content": "Reply with GEMINI_ONLINE"}]))
        if "GEMINI_ONLINE" in resp.content or len(resp.content) > 0:
            print(f"[PASS] Gemini API connection successful ({resp.model}).")
            return True
        else:
            print("[FAIL] Gemini response unexpected format.")
            return False
    except Exception as e:
        print(f"[FAIL] Gemini API connection failed: {type(e).__name__}: {str(e)[:120]}")
        return False

def test_openai():
    try:
        import asyncio
        from llm.provider import OpenAIProvider
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            print("[FAIL] OpenAI: OPENAI_API_KEY missing in environment")
            return False
        openai_p = OpenAIProvider(api_key=key, model="gpt-4o-mini")
        resp = asyncio.run(openai_p.complete([{"role": "user", "content": "Reply with OPENAI_ONLINE"}]))
        if "OPENAI_ONLINE" in resp.content or len(resp.content) > 0:
            print(f"[PASS] OpenAI API connection successful ({resp.model}).")
            return True
        else:
            print("[FAIL] OpenAI response unexpected format.")
            return False
    except Exception as e:
        print(f"[FAIL] OpenAI API connection failed: {type(e).__name__}: {str(e)[:120]}")
        return False

if __name__ == "__main__":
    print("=== Production Infrastructure Verification ===")
    pg_ok = test_postgresql()
    sb_ok = test_supabase()
    gem_ok = test_gemini()
    oai_ok = test_openai()
    print("=== Verification Finished ===")
