# CareerGPT - Architecture Overview

CareerGPT is an agentic AI mentoring system designed as a microservice-ready monolith. 

## System Components

1. **Frontend (React 19 / Vite)**
   - Communicates with the backend exclusively via REST APIs.
   - Preserves state across standard React Contexts without trusting the client for secure operations.
   - Stores session tokens in secure HTTP-only storage (when deployed).

2. **Backend (FastAPI)**
   - Acts as the primary orchestrator of the agentic loops.
   - Exposes RESTful endpoints grouped by domain (`api/auth.py`, `api/interview.py`, `api/career.py`, etc.).
   - Utilizes dependency injection (`Depends`) for authentication, database pooling, and rate limiting.

3. **Agentic Engine (`agents/`)**
   - Implements the continuous **Observe → Decide → Ask → Analyze → Update** loop.
   - Connects to LLMs to perform uncertainty-aware entropy reduction based on the Candidate Competency Graph.

4. **Persistence Layer (`database/`)**
   - SQLAlchemy ORM interacting with PostgreSQL in production or SQLite in local development.
   - Handles schema management, connection pooling, and optimistic locking for concurrency.

5. **Storage Layer (`storage/`)**
   - Abstraction over persistent file storage (e.g., resumes, audio).
   - Supports local file storage and Supabase/S3 Private Bucket Storage.

6. **LLM Abstraction Layer (`llm/`)**
   - Uniform wrapper over OpenAI, Google Gemini, and a deterministic Mock provider.
   - Enforces cost controls, retry logic, rate-limiting adaptation (HTTP 429), and observability tracking.
