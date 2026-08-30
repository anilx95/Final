"""
Unit and Integration Tests for Transactional Email Providers (Resend HTTPS & Gmail SMTP).
Validates provider switching, HTTPS Resend dispatch, error handling, failed OTP invalidation,
and ensuring production never fakes success on missing credentials.
"""

import sys
import os
import time
import uuid
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.entities.user import EmailOTP, User
from app.services.email_otp_service import email_otp_service

client = TestClient(app)


def test_resend_provider_successful_dispatch():
    """Verify that when EMAIL_PROVIDER=resend and valid key is set, Resend HTTPS API is invoked and succeeds."""
    test_email = f"test_resend_{uuid.uuid4().hex[:6]}@example.com"
    otp_code = "123456"

    with patch.object(settings, "EMAIL_PROVIDER", "resend"), \
         patch.object(settings, "RESEND_API_KEY", "re_test_api_key_12345"), \
         patch.object(settings, "RESEND_FROM_EMAIL", "onboarding@resend.dev"), \
         patch.object(settings, "MOCK_EMAIL_IN_DEV", False), \
         patch("resend.Emails.send") as mock_send:

        mock_send.return_value = {"id": "resend_msg_id_9999"}

        success = email_otp_service.send_otp_email(test_email, otp_code, "register")
        assert success is True, "Resend email dispatch should succeed when API returns an ID"
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        assert call_args["to"] == [test_email]
        assert "123456" in call_args["subject"]
        assert "123456" in call_args["text"]
        assert "123456" in call_args["html"]
        print(">>> Resend successful dispatch test passed.")


def test_resend_provider_missing_api_key_fails_safely():
    """Verify that missing RESEND_API_KEY returns False (never fakes success)."""
    test_email = f"test_resend_nokey_{uuid.uuid4().hex[:6]}@example.com"

    with patch.object(settings, "EMAIL_PROVIDER", "resend"), \
         patch.object(settings, "RESEND_API_KEY", ""), \
         patch.object(settings, "MOCK_EMAIL_IN_DEV", False):

        success = email_otp_service.send_otp_email(test_email, "123456", "register")
        assert success is False, "Must fail safely and never fake success when RESEND_API_KEY is empty"
        print(">>> Resend missing API key safe failure test passed.")


def test_resend_provider_api_error_handling():
    """Verify that Resend API errors/exceptions return False without crashing."""
    test_email = f"test_resend_err_{uuid.uuid4().hex[:6]}@example.com"

    with patch.object(settings, "EMAIL_PROVIDER", "resend"), \
         patch.object(settings, "RESEND_API_KEY", "re_test_key"), \
         patch.object(settings, "MOCK_EMAIL_IN_DEV", False), \
         patch("resend.Emails.send", side_effect=Exception("Resend API rate limit or network error")):

        success = email_otp_service.send_otp_email(test_email, "123456", "register")
        assert success is False, "Must return False when Resend throws an exception"
        print(">>> Resend API error handling test passed.")


def test_smtp_missing_credentials_fails_safely_in_prod():
    """Verify that missing SMTP credentials return False when MOCK_EMAIL_IN_DEV=False."""
    test_email = f"test_smtp_nocred_{uuid.uuid4().hex[:6]}@example.com"

    with patch.object(settings, "EMAIL_PROVIDER", "smtp"), \
         patch.object(settings, "SMTP_USER", ""), \
         patch.object(settings, "SMTP_PASSWORD", ""), \
         patch.object(settings, "MOCK_EMAIL_IN_DEV", False):

        success = email_otp_service.send_otp_email(test_email, "123456", "register")
        assert success is False, "Must return False when SMTP credentials are missing and mock mode is False"
        print(">>> SMTP missing credentials safe failure test passed.")


def test_mock_email_only_when_explicitly_enabled():
    """Verify mock email returns True ONLY when MOCK_EMAIL_IN_DEV is True."""
    test_email = f"test_mock_{uuid.uuid4().hex[:6]}@example.com"

    with patch.object(settings, "MOCK_EMAIL_IN_DEV", True):
        success = email_otp_service.send_otp_email(test_email, "123456", "register")
        assert success is True, "Mock email should return True when MOCK_EMAIL_IN_DEV is True"
        print(">>> Mock email explicit enable test passed.")


def test_api_send_otp_resend_failure_cleans_up_otp():
    """Verify that when Resend fails in /api/auth/otp/send, OTP is invalidated so user is not cooldown locked."""
    test_email = f"test_fail_cleanup_{uuid.uuid4().hex[:6]}@example.com"

    with patch.object(settings, "EMAIL_PROVIDER", "resend"), \
         patch.object(settings, "RESEND_API_KEY", "re_test_key"), \
         patch.object(settings, "MOCK_EMAIL_IN_DEV", False), \
         patch("resend.Emails.send", side_effect=Exception("Simulated Resend failure")):

        # First request should fail with 500
        res = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "register"})
        assert res.status_code == 500, f"Expected 500 on email failure, got {res.status_code}"
        assert "Failed to dispatch verification email" in res.json().get("detail", "")

        # Verify OTP was cleaned up and user can request again immediately without 429 cooldown
        # Let's mock a working send for the retry
        with patch("resend.Emails.send", return_value={"id": "resend_success_retry"}):
            res_retry = client.post("/api/auth/otp/send", json={"email": test_email, "purpose": "register"})
            assert res_retry.status_code == 200, f"User should not be cooldown locked after failed send, got {res_retry.status_code}"
            assert res_retry.json()["success"] is True

        print(">>> API Resend failure OTP cleanup test passed.")


def test_unknown_email_provider_handled_gracefully():
    """Verify that an invalid EMAIL_PROVIDER does not crash and returns False."""
    test_email = f"test_unknown_{uuid.uuid4().hex[:6]}@example.com"

    with patch.object(settings, "EMAIL_PROVIDER", "unsupported_provider_xyz"), \
         patch.object(settings, "MOCK_EMAIL_IN_DEV", False):

        success = email_otp_service.send_otp_email(test_email, "123456", "register")
        assert success is False
        print(">>> Unknown provider test passed.")
