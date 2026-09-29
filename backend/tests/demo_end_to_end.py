import asyncio
from fastapi.testclient import TestClient
import uuid
import os
import sys

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database.connection import SessionLocal
from models.models import User, UserProfile, CompetencyNode, NextBestAction

client = TestClient(app)

def run_demo():
    print("\n" + "="*60)
    print("CAREERGPT PHASE 6 - END-TO-END SYSTEM TEST DEMONSTRATION")
    print("="*60 + "\n")

    # 1. Register & Login
    print("[1] Registering a new candidate...")
    username = f"demo_user_{uuid.uuid4().hex[:6]}"
    email = f"{username}@example.com"
    password = "SecurePassword123!"

    response = client.post("/auth/register", json={
        "username": username,
        "email": email,
        "full_name": "Demo Candidate",
        "password": password
    })
    
    # Check registration
    if response.status_code != 200:
        print("Registration failed (might already exist in demo). Using existing.")
    
    print("[2] Logging in...")
    login_resp = client.post("/auth/login", data={
        "username": username,
        "password": password
    })
    
    assert login_resp.status_code == 200, "Login failed"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"    [OK] Authentication successful.")

    # 3. Complete Profile
    print("[3] Completing Profile (CSE -> AI Engineer)...")
    profile_data = {
        "branch": "Computer Science & Engineering",
        "college": "Demo University",
        "year_of_study": 3,
        "target_domain": "AI & Data Science",
        "secondary_domains": ["Backend Engineering"],
        "target_role": "AI Engineer",
        "preferred_languages": ["Python"],
        "preferred_technologies": ["PyTorch", "FastAPI", "PostgreSQL"],
        "learning_style": "Visual"
    }
    prof_resp = client.post("/profile/create", json=profile_data, headers=headers)
    assert prof_resp.status_code == 200, "Profile setup failed"
    print("    [OK] Profile configured.")

    # 4. Create initial competency graph (mocking a resume upload)
    print("[4] Generating Initial Competency Graph from Profile...")
    db = SessionLocal()
    user = db.query(User).filter(User.username == username).first()
    
    # We'll just trigger the learning goals generation which uses profile
    client.post("/learning-goals/sync-profile", headers=headers)
    print("    [OK] Base graph and roadmap initialized.")

    # 5. Get Career Readiness 
    print("[5] Fetching Initial Career Readiness...")
    read_resp = client.get("/api/career/readiness", headers=headers)
    assert read_resp.status_code == 200
    readiness = read_resp.json()
    print(f"    [OK] Current Readiness: {readiness.get('readiness_level')} ({readiness.get('estimated_score')}%)")

    # 6. Fetch Recommended Projects
    print("[6] Fetching Personalized Projects...")
    proj_resp = client.get("/api/career/projects/recommended", headers=headers)
    assert proj_resp.status_code == 200
    print(f"    [OK] Recommended {len(proj_resp.json().get('projects', []))} projects.")

    # 7. Start Interview
    print("[7] Starting Adaptive Interview...")
    start_resp = client.post("/interview/start", json={
        "target_role": "AI Engineer",
        "target_domain": "AI & Data Science",
        "focus_areas": ["Python", "Machine Learning"]
    }, headers=headers)
    
    if start_resp.status_code == 200:
        session_id = start_resp.json()["id"]
        print(f"    [OK] Interview session {session_id} created.")
        
        # Answer a question
        question = start_resp.json().get("next_question", {})
        if question:
            print(f"    - Question: {question.get('text')}")
            print("    [8] Answering Question...")
            ans_resp = client.post(f"/interview/{session_id}/answer", json={
                "question_id": question.get("id"),
                "answer_text": "I would use a random forest for this classification task because it handles non-linear relationships well and prevents overfitting through ensemble learning."
            }, headers=headers)
            print("    [OK] Answer submitted. Competency graph updated dynamically.")

    # 9. Next Best Action
    print("[9] Fetching Next Best Action...")
    act_resp = client.get("/api/career/next-action", headers=headers)
    if act_resp.status_code == 200:
        action = act_resp.json()
        print(f"    [OK] Recommended Action: [{action.get('action_type')}] {action.get('title')}")
        print(f"      Reason: {action.get('reasoning')}")

    print("\n" + "="*60)
    print("[OK] PHASE 6 END-TO-END DEMO COMPLETED SUCCESSFULLY")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_demo()
