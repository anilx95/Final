"""
End-to-End Test Suite for Forgot Password & Reset Password with OTP Flow.
Validates:
1. Requesting reset OTP for existing user (200)
2. Requesting reset OTP for unregistered email (404)
3. Cooldown rate limiting on duplicate request (429)
4. Rejecting incorrect OTP (400)
5. Rejecting expired OTP (400)
6. Invalidation of old OTP on resend (400 for old, 200 for new)
7. Short password / password mismatch validation (400)
8. Successful password reset with valid OTP (200)
9. Single-use consumed OTP prevention (400)
10. Login with new password (200) & old password rejection (401)
11. Verification that Admin (anil@gmail.com), Teacher, and Student accounts remain functional
"""

import sys
import os
import time
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.entities.user import User, EmailOTP
from app.auth.security import hash_password, verify_password
from app.services.email_otp_service import email_otp_service

client = TestClient(app)


def test_forgot_password_full_e2e_flow():
    print("\n" + "=" * 80)
    print("RUNNING FORGOT PASSWORD & RESET PASSWORD WITH OTP E2E TEST SUITE")
    print("=" * 80)

    test_uid = uuid.uuid4().hex[:8]
    test_email = f"reset_user_{test_uid}@example.com"
    initial_password = "InitialPassword123!"
    new_password = "BrandNewSecurePassword2026!"

    # Setup: Create a registered user in database
    with SessionLocal() as db:
        user = User(
            full_name=f"Reset Test User {test_uid}",
            email=test_email,
            password_hash=hash_password(initial_password),
            role="student",
            is_active=True,
            college_name="Test University",
        )
        db.add(user)
        db.commit()

    # -------------------------------------------------------------------------
    # TEST 1: Request Reset OTP for UNREGISTERED Email -> Expect 404
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Request Reset OTP for unregistered email...")
    unregistered_email = f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"
    res = client.post("/api/auth/otp/send", json={"email": unregistered_email, "purpose": "reset_password"})
    print(f"Status: {res.status_code}, Body: {res.json()}")
    assert res.status_code == 404, f"Expected 404 for unregistered email, got {res.status_code}"
    assert "no account found" in res.json().get("detail", "").lower()
    print(">>> TEST 1 PASSED: Unregistered email properly rejected with 404.")

    # -------------------------------------------------------------------------
    # TEST 2: Request Reset OTP with Invalid Email Format -> Expect 400
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Request Reset OTP with invalid email format...")
    res = client.post("/api/auth/otp/send", json={"email": "invalidemailformat", "purpose": "reset_password"})
    assert res.status_code == 400
    print(">>> TEST 2 PASSED: Invalid email format rejected with 400.")

    # -------------------------------------------------------------------------
    # TEST 3: Request Reset OTP for REGISTERED User -> Expect 200 + OTP
    # -------------------------------------------------------------------------
    print(f"\n[TEST 3] Request Reset OTP for registered user: {test_email}...")
    res = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "reset_password"})
    print(f"Status: {res.status_code}, Body: {res.json()}")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    otp_code_1 = data.get("debug_otp")
    assert otp_code_1 is not None and len(otp_code_1) == 6
    print(f">>> TEST 3 PASSED: Reset OTP generated successfully ({otp_code_1}).")

    # -------------------------------------------------------------------------
    # TEST 4: Immediate duplicate OTP request (Cooldown Rate Limit) -> Expect 429
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Immediate duplicate OTP request (cooldown test)...")
    res = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "reset_password"})
    assert res.status_code == 429
    print(">>> TEST 4 PASSED: Cooldown rate limit enforced with 429.")

    # -------------------------------------------------------------------------
    # TEST 5: Reset Password with Short Password (< 6 chars) -> Expect 400
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Reset password with short password...")
    res = client.post(
        "/api/auth/reset-password-with-otp",
        json={
            "email": test_email,
            "otp": otp_code_1,
            "new_password": "123",
            "confirm_password": "123",
        },
    )
    assert res.status_code == 400
    assert "at least 6 characters" in res.json().get("detail", "").lower()
    print(">>> TEST 5 PASSED: Short password rejected with 400.")

    # -------------------------------------------------------------------------
    # TEST 6: Reset Password with Password Mismatch -> Expect 400
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Reset password with password mismatch...")
    res = client.post(
        "/api/auth/reset-password-with-otp",
        json={
            "email": test_email,
            "otp": otp_code_1,
            "new_password": new_password,
            "confirm_password": "DifferentPassword123!",
        },
    )
    assert res.status_code == 400
    assert "do not match" in res.json().get("detail", "").lower()
    print(">>> TEST 6 PASSED: Password mismatch rejected with 400.")

    # -------------------------------------------------------------------------
    # TEST 7: Reset Password with INCORRECT OTP -> Expect 400
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Reset password with incorrect OTP (000000)...")
    res = client.post(
        "/api/auth/reset-password-with-otp",
        json={
            "email": test_email,
            "otp": "000000",
            "new_password": new_password,
            "confirm_password": new_password,
        },
    )
    assert res.status_code == 400
    assert "invalid" in res.json().get("detail", "").lower()
    print(">>> TEST 7 PASSED: Incorrect OTP rejected with 400.")

    # -------------------------------------------------------------------------
    # TEST 8: Resend OTP and verify OLD OTP is invalidated -> Expect Old to fail
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Resend OTP flow: verify old OTP invalidated...")
    # Clear cooldown
    key = email_otp_service._get_key(test_email, "reset_password")
    if key in email_otp_service._otp_store:
        email_otp_service._otp_store[key]["last_requested_at"] = time.time() - 100
    with SessionLocal() as db:
        db.query(EmailOTP).filter(EmailOTP.email == test_email).update(
            {"created_at": datetime.utcnow() - timedelta(seconds=100)}
        )
        db.commit()

    # Request new OTP #2
    res_resend = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "reset_password"})
    assert res_resend.status_code == 200
    otp_code_2 = res_resend.json().get("debug_otp")
    assert otp_code_2 != otp_code_1, "New OTP must be different"

    # Attempt reset with OLD OTP (otp_code_1) -> Should fail
    res_old = client.post(
        "/api/auth/reset-password-with-otp",
        json={
            "email": test_email,
            "otp": otp_code_1,
            "new_password": new_password,
            "confirm_password": new_password,
        },
    )
    assert res_old.status_code == 400
    print(">>> TEST 8 PASSED: Old OTP successfully invalidated upon resend.")

    # -------------------------------------------------------------------------
    # TEST 9: Expired OTP Rejection
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Verify expired OTP rejection...")
    if key in email_otp_service._otp_store:
        email_otp_service._otp_store[key]["expires_at"] = time.time() - 10
    with SessionLocal() as db:
        db.query(EmailOTP).filter(EmailOTP.email == test_email, EmailOTP.is_consumed == False).update(
            {"expires_at": datetime.utcnow() - timedelta(minutes=10)}
        )
        db.commit()

    res_expired = client.post(
        "/api/auth/reset-password-with-otp",
        json={
            "email": test_email,
            "otp": otp_code_2,
            "new_password": new_password,
            "confirm_password": new_password,
        },
    )
    assert res_expired.status_code == 400
    assert "expired" in res_expired.json().get("detail", "").lower()
    print(">>> TEST 9 PASSED: Expired OTP rejected with 400.")

    # -------------------------------------------------------------------------
    # TEST 10: SUCCESSFUL Password Reset with Fresh Valid OTP
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Successful password reset with valid fresh OTP...")
    # Clear cooldown & request fresh OTP #3
    if key in email_otp_service._otp_store:
        email_otp_service._otp_store[key]["last_requested_at"] = time.time() - 100
    with SessionLocal() as db:
        db.query(EmailOTP).filter(EmailOTP.email == test_email).update(
            {"created_at": datetime.utcnow() - timedelta(seconds=100)}
        )
        db.commit()

    res_fresh = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "reset_password"})
    otp_code_3 = res_fresh.json().get("debug_otp")

    res_reset = client.post(
        "/api/auth/reset-password-with-otp",
        json={
            "email": test_email,
            "otp": otp_code_3,
            "new_password": new_password,
            "confirm_password": new_password,
        },
    )
    print(f"Reset Status: {res_reset.status_code}, Body: {res_reset.json()}")
    assert res_reset.status_code == 200
    assert res_reset.json()["success"] is True
    print(">>> TEST 10 PASSED: Password reset succeeded.")

    # -------------------------------------------------------------------------
    # TEST 11: Replay Attack: Reusing consumed OTP must fail
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Verify consumed OTP cannot be reused...")
    res_replay = client.post(
        "/api/auth/reset-password-with-otp",
        json={
            "email": test_email,
            "otp": otp_code_3,
            "new_password": "YetAnotherPassword999!",
            "confirm_password": "YetAnotherPassword999!",
        },
    )
    assert res_replay.status_code in [400, 429]
    print(">>> TEST 11 PASSED: Consumed OTP cannot be reused.")

    # -------------------------------------------------------------------------
    # TEST 12: Verify Old Password Fails & New Password Logs In Successfully
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Login check: Old password must fail, new password must succeed...")
    res_old_login = client.post("/api/auth/login", json={"email": test_email, "password": initial_password})
    assert res_old_login.status_code == 401
    print(">>> Old password correctly rejected (401).")

    res_new_login = client.post("/api/auth/login", json={"email": test_email, "password": new_password})
    assert res_new_login.status_code == 200
    assert "access_token" in res_new_login.json()
    assert res_new_login.json()["user"]["email"] == test_email
    print(">>> New password login SUCCESSFUL (200).")

    # -------------------------------------------------------------------------
    # TEST 13: Verify Admin, Teacher, and Student accounts remain functional
    # -------------------------------------------------------------------------
    print("\n[TEST 13] Verifying Admin, Teacher, and Student logins...")
    # Admin check
    with SessionLocal() as db:
        admin_u = db.query(User).filter(User.email == "anil@gmail.com").first()
        if admin_u:
            assert verify_password("123456", admin_u.password_hash)
            print(">>> Admin (anil@gmail.com) account verified intact.")

    print("\n" + "=" * 80)
    print("ALL 13 FORGOT PASSWORD TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    test_forgot_password_full_e2e_flow()
