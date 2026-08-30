import sys
import os
import time
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.entities.user import User, EmailOTP
from app.services.email_otp_service import email_otp_service
from app.core.database import SessionLocal, engine, Base
from app.models.entities.user import User, EmailOTP
from app.services.email_otp_service import email_otp_service

client = TestClient(app)


def test_otp_flow_all_scenarios():
    print("\n" + "=" * 80)
    print("RUNNING END-TO-END EMAIL OTP AUTHENTICATION TEST SUITE")
    print("=" * 80)

    test_uid = uuid.uuid4().hex[:8]
    test_email = f"testuser_{test_uid}@example.com"
    test_password = "Password123!"
    test_name = f"Test User {test_uid}"

    # -------------------------------------------------------------------------
    # TEST 3: Invalid Email (no @)
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Request OTP with invalid email format (no @)...")
    res = client.post("/api/auth/otp/send", json={"email": "invalidemailformat", "purpose": "register"})
    print(f"Status: {res.status_code}, Body: {res.json()}")
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "valid email" in res.json().get("detail", "").lower()
    print(">>> TEST 3 PASSED: Returned 400 with proper validation message (not 404).")

    # -------------------------------------------------------------------------
    # TEST 1: Request OTP with valid new email
    # -------------------------------------------------------------------------
    print(f"\n[TEST 1] Request OTP for new registration: {test_email}...")
    res = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "register"})
    print(f"Status: {res.status_code}, Body: {res.json()}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["success"] is True
    assert data["cooldown_seconds"] == 60
    debug_otp = data.get("debug_otp")
    assert debug_otp is not None and len(debug_otp) == 6
    print(f">>> TEST 1 PASSED: OTP successfully generated ({debug_otp}), cooldown 60s.")

    # -------------------------------------------------------------------------
    # TEST 8: Rate Limiting / 60s Cooldown
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Immediate duplicate OTP request (cooldown test)...")
    res = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "register"})
    print(f"Status: {res.status_code}, Body: {res.json()}")
    assert res.status_code == 429, f"Expected 429 Too Many Requests, got {res.status_code}"
    assert "wait" in res.json().get("detail", "").lower()
    print(">>> TEST 8 PASSED: Returned 429 Too Many Requests with seconds remaining.")

    # -------------------------------------------------------------------------
    # TEST 5: Register with wrong OTP
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Register with invalid/wrong OTP (999999)...")
    res = client.post(
        "/api/auth/register-with-otp",
        json={
            "full_name": test_name,
            "email": test_email,
            "password": test_password,
            "role": "student",
            "college_name": "Test University",
            "otp": "999999",
        },
    )
    print(f"Status: {res.status_code}, Body: {res.json()}")
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "invalid" in res.json().get("detail", "").lower()
    print(">>> TEST 5 PASSED: Returned 400 Invalid verification code (not 404).")

    # -------------------------------------------------------------------------
    # TEST 7: Resend flow & Latest OTP validation
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Resend OTP flow: verify old OTP is invalidated and latest works...")
    # Clear cooldown manually in DB and in memory for testing resend
    key = email_otp_service._get_key(test_email, "register")
    if key in email_otp_service._otp_store:
        email_otp_service._otp_store[key]["last_requested_at"] = time.time() - 100
    with SessionLocal() as db:
        db.query(EmailOTP).filter(EmailOTP.email == test_email).update(
            {"created_at": datetime.utcnow() - timedelta(seconds=100)}
        )
        db.commit()

    # Request new OTP #2
    res2 = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "register"})
    assert res2.status_code == 200
    otp_code_2 = res2.json().get("debug_otp")
    assert otp_code_2 != debug_otp, "New OTP should be unique"

    # Attempt registration with OLD OTP (debug_otp) -> should fail
    res_old = client.post(
        "/api/auth/register-with-otp",
        json={
            "full_name": test_name,
            "email": test_email,
            "password": test_password,
            "role": "student",
            "college_name": "Test University",
            "otp": debug_otp,
        },
    )
    assert res_old.status_code == 400
    print(">>> Old OTP correctly rejected after resend.")

    # -------------------------------------------------------------------------
    # TEST 6: Expired OTP rejection
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Verify expired OTP rejection...")
    # Simulate expiration in DB and memory
    if key in email_otp_service._otp_store:
        email_otp_service._otp_store[key]["expires_at"] = time.time() - 10
    with SessionLocal() as db:
        db.query(EmailOTP).filter(EmailOTP.email == test_email, EmailOTP.is_consumed == False).update(
            {"expires_at": datetime.utcnow() - timedelta(minutes=10)}
        )
        db.commit()

    res_expired = client.post(
        "/api/auth/register-with-otp",
        json={
            "full_name": test_name,
            "email": test_email,
            "password": test_password,
            "role": "student",
            "college_name": "Test University",
            "otp": otp_code_2,
        },
    )
    print(f"Status: {res_expired.status_code}, Body: {res_expired.json()}")
    assert res_expired.status_code == 400
    assert "expired" in res_expired.json().get("detail", "").lower()
    print(">>> TEST 6 PASSED: Expired OTP rejected with 400 'OTP has expired'.")

    # -------------------------------------------------------------------------
    # TEST 4: Successful Registration with OTP
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Successful account registration with valid fresh OTP...")
    # Generate fresh OTP
    if key in email_otp_service._otp_store:
        email_otp_service._otp_store[key]["last_requested_at"] = time.time() - 100
    with SessionLocal() as db:
        db.query(EmailOTP).filter(EmailOTP.email == test_email).update(
            {"created_at": datetime.utcnow() - timedelta(seconds=100)}
        )
        db.commit()

    res_fresh = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "register"})
    fresh_otp = res_fresh.json().get("debug_otp")

    res_reg = client.post(
        "/api/auth/register-with-otp",
        json={
            "full_name": test_name,
            "email": test_email,
            "password": test_password,
            "role": "student",
            "college_name": "Stanford University",
            "otp": fresh_otp,
            "roll_number": f"STU-{test_uid.upper()}",
            "disability_profiles": ["visual_impairment"],
        },
    )
    print(f"Status: {res_reg.status_code}, Body: {res_reg.json()}")
    assert res_reg.status_code == 200, f"Expected 200, got {res_reg.status_code}"
    reg_data = res_reg.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == test_email
    assert reg_data["user"]["role"] == "student"

    # Verify user exists in database with student profile
    with SessionLocal() as db:
        user_db = db.query(User).filter(User.email == test_email).first()
        assert user_db is not None
        assert user_db.student is not None
        assert user_db.student.college_name == "Stanford University"
    print(">>> TEST 4 PASSED: User successfully created in DB with token & student profile.")

    # -------------------------------------------------------------------------
    # Single-use check: Trying to re-use consumed OTP should fail
    # -------------------------------------------------------------------------
    print("\n[Single-use Check] Attempting to re-use consumed OTP...")
    res_reuse = client.post(
        "/api/auth/register-with-otp",
        json={
            "full_name": test_name,
            "email": test_email,
            "password": test_password,
            "role": "student",
            "college_name": "Stanford University",
            "otp": fresh_otp,
        },
    )
    assert res_reuse.status_code in [400, 429]
    print(">>> Consumed OTP correctly rejected on reuse.")

    # -------------------------------------------------------------------------
    # TEST 2: Request OTP for already registered email with purpose=register
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Request OTP with already-registered email (purpose=register)...")
    res_duplicate = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "register"})
    print(f"Status: {res_duplicate.status_code}, Body: {res_duplicate.json()}")
    assert res_duplicate.status_code == 400, f"Expected 400, got {res_duplicate.status_code}"
    assert "already registered" in res_duplicate.json().get("detail", "").lower()
    print(">>> TEST 2 PASSED: Returned 400 'Email is already registered' (not 404).")

    # -------------------------------------------------------------------------
    # Additional: Test Standard Password Login & OTP Login
    # -------------------------------------------------------------------------
    print("\n[Password Login] Testing login with valid password...")
    res_login = client.post("/api/auth/login", json={"email": test_email, "password": test_password})
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()
    print(">>> Password Login SUCCESSFUL.")

    print("\n[Password Login Fail] Testing login with wrong password...")
    res_login_bad = client.post("/api/auth/login", json={"email": test_email, "password": "WrongPassword123"})
    assert res_login_bad.status_code == 401
    assert "invalid" in res_login_bad.json().get("detail", "").lower()
    print(">>> Password Login with wrong password correctly returned 401 Unauthorized (not 404).")

    print("\n[OTP Login Flow] Request OTP for purpose=login...")
    # Clear cooldown
    key_login = email_otp_service._get_key(test_email, "login")
    if key_login in email_otp_service._otp_store:
        email_otp_service._otp_store[key_login]["last_requested_at"] = time.time() - 100
    with SessionLocal() as db:
        db.query(EmailOTP).filter(EmailOTP.email == test_email).update(
            {"created_at": datetime.utcnow() - timedelta(seconds=100)}
        )
        db.commit()

    res_login_otp_send = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "login"})
    assert res_login_otp_send.status_code == 200
    login_otp = res_login_otp_send.json().get("debug_otp")

    print(f"\n[OTP Login Verify] Submitting OTP login code {login_otp}...")
    res_login_otp = client.post("/api/auth/login-with-otp", json={"email": test_email, "otp": login_otp})
    assert res_login_otp.status_code == 200
    assert "access_token" in res_login_otp.json()
    assert res_login_otp.json()["user"]["email"] == test_email
    print(">>> OTP Login SUCCESSFUL.")

    print("\n" + "=" * 80)
    print("ALL 8 TESTS AND EXTRA VERIFICATIONS PASSED PERFECTLY!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    test_otp_flow_all_scenarios()
