from agents.interview_agent import InterviewAgent
from llm.provider import get_llm_provider
import asyncio

async def main():
    agent = InterviewAgent(llm_provider=get_llm_provider())
    try:
        session = agent.initialize_session(
            user_id="test",
            interview_id="test",
            target_role="Backend Developer",
            target_domain="Software",
            branch="CS",
            resume_skills=[],
            role_required_skills=["python", "sql"],
            max_questions=3
        )
        print("Session Initialized:", session)
        q = await agent.decide_next_action()
        print("Next Question:", q)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
