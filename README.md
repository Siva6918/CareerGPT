# CareerGPT

**Agentic AI-Based Career Mentoring & Placement Readiness System**

CareerGPT is an end-to-end research prototype designed to transform static career advice into an **Adaptive AI Mentor**. Instead of serving static roadmaps, the system builds a dynamic graph of a candidate's competencies, identifies uncertainties, conducts adaptive multimodal interviews to gather evidence, and computes precise placement readiness and personalized action plans.

---

## 1. Problem
Traditional placement preparation and career roadmaps are static and generic. Students from various engineering branches receive the same generalized advice, ignoring their unique baseline knowledge, skill gaps, and evidence of competency. 

## 2. Motivation
To bridge the gap between academic learning and industry expectations by providing a personalized, continuous, and evidence-driven AI mentor that adapts to the candidate's actual demonstrated skills rather than their self-reported claims.

## 3. Proposed Solution
CareerGPT introduces a continuously updating **Dynamic Candidate Competency Graph**. It uses an agentic workflow to identify missing information (entropy), requests evidence via an adaptive interview, and then recalculates a personalized learning roadmap, projects, and career readiness scores.

## 4. Architecture
```text
                         USER
                          │
                          ▼
                 ┌─────────────────┐
                 │ Profile & Resume│
                 └────────┬────────┘
                          ▼
             ┌───────────────────────────┐
             │ Dynamic Competency Graph  │
             └────────────┬──────────────┘
                          ▼
                ┌──────────────────┐
                │ Adaptive         │
                │ Interview Agent  │
                └────────┬─────────┘
                         ▼
        ┌──────────────────────────────────┐
        │      CAREER INTELLIGENCE         │
        ├──────────────────────────────────┤
        │ Readiness & Skill Gaps           │
        │ Projects & Next Best Action      │
        └────────────────┬─────────────────┘
                         ▼
                   GRAPH UPDATE
                         │
                         └──────────► LOOP
```

## 5. Agentic Workflow
The system follows a continuous Observe → Decide → Ask → Analyze → Update loop. The AI agent observes the graph, decides which competencies have the highest uncertainty, asks targeted questions, analyzes the answers, and updates the graph.

## 6. Dynamic Competency Graph
A directed graph representing skills, concepts, tools, and languages. Each node maintains a Bayesian representation of competency (e.g., Unknown, Developing, Strong) and an uncertainty score.

## 7. Multimodal Evidence
Competency is estimated through multiple channels of evidence:
- Resume parsing (Text)
- Adaptive Interviews (Text/Voice)
- Project completion signals

## 8. Adaptive Interview
The interview engine uses probabilistic entropy reduction to target the highest-uncertainty skills first. Difficulty scales adaptively based on the user's previous answers.

## 9. Roadmap Engine
Generates multi-domain, branch-specific learning paths dynamically based on the current state of the Competency Graph. It highlights nodes that are missing or weak.

## 10. Career Intelligence
A suite of analytics providing real-time calculation of placement readiness, weighted by evidence and confidence.

## 11. Project Recommendation
Recommends portfolio-worthy projects specifically designed to address the user's most critical high-priority skill gaps.

## 12. Role Matching
Compares the candidate's proven competency graph against industry role requirements to calculate a match percentage and identify missing prerequisites.

## 13. Technology Stack
- **Frontend**: React 19, Vite, Framer Motion, Lucide Icons (Glassmorphism aesthetics)
- **Backend**: FastAPI, Python 3.10+
- **Database**: PostgreSQL / SQLite (via SQLAlchemy)
- **AI/LLM**: Provider Abstraction (OpenAI, Gemini, Mock Fallbacks)

## 14. Installation & Environment Setup
1. Clone the repository.
2. Navigate to `backend/` and create a virtual environment: `python -m venv .venv`
3. Activate the virtual environment and install dependencies: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and configure your API keys (e.g., `GEMINI_API_KEY`).
5. Navigate to `frontend/` and run `npm install`.

## 15. Running Locally
- **Backend**: `python main.py` or `uvicorn main:app --reload`
- **Frontend**: `npm run dev`

## 16. Testing & Evaluation
Run the end-to-end demonstration scenario:
```bash
python backend/tests/demo_end_to_end.py
```
This tests the full integration loop from registration to career intelligence generation.

## 17. Research Contribution Summary
This project demonstrates:
1. **Dynamic Candidate Competency Graph**: Moving beyond flat lists of skills.
2. **Uncertainty-Aware Multimodal Estimation**: Distinguishing between "weak skill" and "unknown skill".
3. **Adaptive Evidence Acquisition**: An interview policy that asks the most informationally valuable questions.
4. **Evidence-Driven Career Intelligence**: Actionable recommendations grounded in demonstrated proof.

## 18. Limitations
- External LLM API availability and latency bounds real-time interview performance.
- Relies on structured parsing which can occasionally misinterpret unstructured resumes.
- Vision signals are currently auxiliary; the primary driver remains text/speech semantic analysis.
