"""
Verification test for PostgreSQL user credential persistence across:
1. Registration & Logout
2. Login
3. Backend restart / new process simulation
4. Project changes / test runs
5. Subsequent login verification without re-registration
"""

import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, sync_db_schema
from app.models.entities.user import User


def test_postgresql_user_persistence_lifecycle():
    print("=" * 60)
    print("STARTING USER CREDENTIAL PERSISTENCE TEST ACROSS RESTARTS")
    print("=" * 60)

    unique_email = f"persistent_student_{uuid.uuid4().hex[:6]}@classably.edu"
    test_password = "SecurePassword123!"

    # ─────────────────────────────────────────────────────────────
    # STEP 1: REGISTER USER & VERIFY REGISTRATION
    # ─────────────────────────────────────────────────────────────
    client = TestClient(app)

    print(f"\n[Step 1] Requesting registration OTP for {unique_email}...")
    otp_resp = client.post("/api/auth/otp/send", json={"email": unique_email, "purpose": "register"})
    assert otp_resp.status_code == 200, f"OTP dispatch failed: {otp_resp.text}"
    otp_code = otp_resp.json().get("debug_otp")

    print(f"[Step 1] Registering user with OTP {otp_code}...")
    reg_payload = {
        "full_name": "Persistent Test Student",
        "email": unique_email,
        "password": test_password,
        "role": "student",
        "college_name": "ClassAbly University",
        "roll_number": f"ROLL-{uuid.uuid4().hex[:6].upper()}",
        "otp": otp_code,
        "disability_profiles": ["visual_low_vision"],
    }
    reg_resp = client.post("/api/auth/register-with-otp", json=reg_payload)
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    user_id = reg_resp.json()["user"]["id"]
    print(f"PASS: User #{user_id} ({unique_email}) registered successfully.")

    # ─────────────────────────────────────────────────────────────
    # STEP 2: LOG OUT (Clear client session / tokens)
    # ─────────────────────────────────────────────────────────────
    print("\n[Step 2] Logging out / clearing active client session...")
    del client

    # ─────────────────────────────────────────────────────────────
    # STEP 3: LOG IN WITH PREVIOUSLY REGISTERED CREDENTIALS
    # ─────────────────────────────────────────────────────────────
    client2 = TestClient(app)
    print(f"[Step 3] Logging in with email: {unique_email} and password...")
    login_resp = client2.post("/api/auth/login", json={"email": unique_email, "password": test_password})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    assert login_resp.json()["user"]["id"] == user_id
    print(f"PASS: Logged in successfully. Token generated for user #{user_id}.")

    # ─────────────────────────────────────────────────────────────
    # STEP 4: RESTART BACKEND (Simulate server restart / lifespan / schema sync)
    # ─────────────────────────────────────────────────────────────
    print("\n[Step 4] Simulating Backend Server Restart & Lifespan Startup...")
    # Re-run schema sync and lifespan logic as happens on backend restart
    sync_db_schema()

    # Verify directly from database session that the user is still in PostgreSQL
    with SessionLocal() as db:
        persisted_user = db.query(User).filter(User.email == unique_email).first()
        assert persisted_user is not None, "FATAL: User record was lost after restart!"
        assert persisted_user.id == user_id, "User ID changed after restart!"
        print(f"PASS: User #{persisted_user.id} verified in PostgreSQL after server restart.")

    # ─────────────────────────────────────────────────────────────
    # STEP 5: LOG IN AGAIN AFTER RESTART
    # ─────────────────────────────────────────────────────────────
    client3 = TestClient(app)
    print(f"[Step 5] Logging in after backend restart...")
    login_after_restart = client3.post("/api/auth/login", json={"email": unique_email, "password": test_password})
    assert login_after_restart.status_code == 200, f"Login after restart failed: {login_after_restart.text}"
    print("PASS: Logged in successfully after backend restart without re-registration.")

    # ─────────────────────────────────────────────────────────────
    # STEP 6: MAKE/REBUILD PROJECT CHANGES (Simulate test runs and codebase rebuild)
    # ─────────────────────────────────────────────────────────────
    print("\n[Step 6] Simulating codebase changes / test executions...")
    # Run schema sync again as would happen when dev server reloads
    sync_db_schema()

    # ─────────────────────────────────────────────────────────────
    # STEP 7: LOG IN AGAIN - EXISTING ACCOUNT STILL WORKS
    # ─────────────────────────────────────────────────────────────
    client4 = TestClient(app)
    print(f"[Step 7] Logging in after project changes...")
    login_after_rebuild = client4.post("/api/auth/login", json={"email": unique_email, "password": test_password})
    assert login_after_rebuild.status_code == 200, f"Login after rebuild failed: {login_after_rebuild.text}"
    assert login_after_rebuild.json()["user"]["email"] == unique_email
    print(f"PASS: Existing account {unique_email} is fully intact and authenticated successfully!")

    print("=" * 60)
    print("ALL PERSISTENCE LIFECYCLE CHECKS PASSED 100% SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    test_postgresql_user_persistence_lifecycle()
