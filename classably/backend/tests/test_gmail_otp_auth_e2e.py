"""
End-to-End Test Suite for Gmail OTP Authentication (Registration & Login).
Tests directly against running backend on http://127.0.0.1:8000.
"""

import sys
import os
import time
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.services.email_otp_service import email_otp_service

BASE_URL = "http://127.0.0.1:8000"


def test_otp_service_core():
    print("\n=======================================================")
    print("TEST 1: OTP SERVICE GENERATION, HASHING & EXPIRY")
    print("=======================================================")

    test_email = "core.test.student@gmail.com"
    purpose = "register"

    # 1. Generate OTP
    otp = email_otp_service.generate_otp(test_email, purpose)
    print(f"Generated 6-digit OTP: {otp}")
    assert len(otp) == 6 and otp.isdigit(), "OTP must be a 6-digit number"

    # 2. Rate limit check
    allowed, remaining = email_otp_service.check_rate_limit(test_email, purpose)
    print(f"Immediate second request cooldown check: allowed={allowed}, remaining={remaining}s")
    assert not allowed, "Immediate second request should be rate-limited by cooldown"
    assert remaining > 0

    # 3. Verify incorrect OTP
    valid, msg = email_otp_service.verify_otp(test_email, "000000", purpose, consume=False)
    print(f"Incorrect OTP verification: valid={valid}, msg='{msg}'")
    assert not valid

    # 4. Verify correct OTP
    valid, msg = email_otp_service.verify_otp(test_email, otp, purpose, consume=True)
    print(f"Correct OTP verification: valid={valid}, msg='{msg}'")
    assert valid

    # 5. Verify cannot reuse consumed OTP
    valid, msg = email_otp_service.verify_otp(test_email, otp, purpose, consume=True)
    print(f"Replay attack check: valid={valid}, msg='{msg}'")
    assert not valid, "Consumed OTP must not be reusable"

    print("OTP SERVICE CORE PASSED! ✅\n")


def test_registration_with_otp_flow():
    print("\n=======================================================")
    print("TEST 2: NEW USER REGISTRATION WITH GMAIL OTP")
    print("=======================================================")

    new_email = f"student_{int(time.time())}@gmail.com"

    # Step 1: Request Registration OTP via API
    res_send = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"email": new_email, "purpose": "register"})
    print("Send OTP Response:", res_send.status_code, res_send.json())
    assert res_send.status_code == 200
    assert res_send.json()["success"] is True
    valid_otp = res_send.json()["debug_otp"]

    # Step 2: Attempt registration with BAD OTP -> Must Fail
    bad_payload = {
        "full_name": "New Student",
        "email": new_email,
        "password": "SecureStudentPass123!",
        "role": "student",
        "college_name": "Stanford University",
        "roll_number": f"STU-{int(time.time()) % 1000000}",
        "otp": "000000",
    }
    res_bad = requests.post(f"{BASE_URL}/api/auth/register-with-otp", json=bad_payload)
    print("Bad OTP Registration Response:", res_bad.status_code, res_bad.json())
    assert res_bad.status_code == 400
    err_text = str(res_bad.json().get("message") or res_bad.json().get("detail", "")).lower()
    assert "invalid" in err_text or "expired" in err_text

    # Step 3: Attempt registration with VALID OTP -> Must Succeed
    valid_payload = {
        **bad_payload,
        "otp": valid_otp,
    }
    res_valid = requests.post(f"{BASE_URL}/api/auth/register-with-otp", json=valid_payload)
    print("Valid OTP Registration Response:", res_valid.status_code, res_valid.json())
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert "access_token" in data
    assert data["user"]["email"] == new_email
    assert data["user"]["role"] == "student"

    # Step 4: Verify Direct Password Login works for this newly created account
    res_pass = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": new_email,
        "password": "SecureStudentPass123!",
    })
    print("Direct Password Login for New User:", res_pass.status_code)
    assert res_pass.status_code == 200

    # Step 5: Verify Gmail OTP Login works for this newly created account
    res_l_otp = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"email": new_email, "purpose": "login"})
    print("Send Login OTP Response:", res_l_otp.status_code, res_l_otp.json())
    assert res_l_otp.status_code == 200
    login_otp = res_l_otp.json()["debug_otp"]

    res_login_otp = requests.post(f"{BASE_URL}/api/auth/login-with-otp", json={
        "email": new_email,
        "otp": login_otp,
    })
    print("Gmail OTP Login for New User:", res_login_otp.status_code, res_login_otp.json())
    assert res_login_otp.status_code == 200
    assert res_login_otp.json()["user"]["email"] == new_email

    # Step 6: Verify Replaying consumed Login OTP fails
    res_reuse = requests.post(f"{BASE_URL}/api/auth/login-with-otp", json={
        "email": new_email,
        "otp": login_otp,
    })
    print("Replay Consumed OTP Response:", res_reuse.status_code)
    assert res_reuse.status_code == 400

    print("NEW USER REGISTRATION WITH GMAIL OTP PASSED! ✅\n")


def test_login_otp_validation_and_security():
    print("\n=======================================================")
    print("TEST 3: GMAIL OTP LOGIN SECURITY & NON-EXISTENT USER")
    print("=======================================================")

    # 1. Non-existent email -> 404
    res_404 = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
        "email": "nonexistent.random.user.99@gmail.com",
        "purpose": "login",
    })
    print("Non-existent user OTP request:", res_404.status_code, res_404.json())
    assert res_404.status_code == 404

    # 2. Invalid email format -> 400
    res_invalid_email = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
        "email": "notanemail",
        "purpose": "register",
    })
    print("Invalid email format request:", res_invalid_email.status_code)
    assert res_invalid_email.status_code == 400

    print("GMAIL OTP LOGIN SECURITY PASSED! ✅\n")


if __name__ == "__main__":
    test_otp_service_core()
    test_registration_with_otp_flow()
    test_login_otp_validation_and_security()
    print("\n🎉 ALL GMAIL OTP AUTHENTICATION TESTS PASSED WITH 100% SUCCESS! 🎉\n")
