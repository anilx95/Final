"""
Gmail SMTP & OTP Authentication Service.
Handles cryptographically secure OTP generation, hashing, rate limiting, and Gmail SMTP delivery.
Persists hashed OTPs to SQLite database for multi-process safety and reliability.
"""

import os
import time
import hmac
import hashlib
import secrets
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.entities.user import EmailOTP

logger = logging.getLogger(__name__)


class EmailOTPService:
    def __init__(self):
        # In-memory fast cache
        self._otp_store: Dict[str, dict] = {}

    def _get_key(self, email: str, purpose: str) -> str:
        return f"{email.lower().strip()}:{purpose.lower().strip()}"

    def _hash_otp(self, otp: str, salt: str) -> str:
        secret_key = settings.SECRET_KEY
        if not secret_key or secret_key == "default-production-secret-key-classably-accessibility-2026":
            logger.warning("[OTP Security] SECRET_KEY is missing or using default — OTP hashing uses fallback pepper")
            secret_key = "classably_otp_secure_pepper_2026"
        secret = secret_key.encode("utf-8")
        data = f"{salt}:{otp}".encode("utf-8")
        return hmac.new(secret, data, hashlib.sha256).hexdigest()

    def check_rate_limit(self, email: str, purpose: str, db: Optional[Session] = None) -> Tuple[bool, int]:
        """Check if request is within cooldown period. Returns (allowed, seconds_remaining)."""
        clean_email = email.lower().strip()
        clean_purpose = purpose.lower().strip()
        cooldown = settings.OTP_COOLDOWN_SECONDS

        # Check DB first if available
        should_close_db = False
        if db is None:
            db = SessionLocal()
            should_close_db = True

        try:
            last_record = (
                db.query(EmailOTP)
                .filter(
                    EmailOTP.email == clean_email,
                    EmailOTP.purpose == clean_purpose,
                )
                .order_by(EmailOTP.created_at.desc())
                .first()
            )
            if last_record:
                elapsed = (datetime.utcnow() - last_record.created_at).total_seconds()
                if elapsed < cooldown:
                    return False, int(cooldown - elapsed)
        except Exception as e:
            logger.warning(f"[OTP] DB rate-limit check notice for {clean_email}: {e}")
        finally:
            if should_close_db:
                db.close()

        # Check in-memory fallback
        key = self._get_key(clean_email, clean_purpose)
        entry = self._otp_store.get(key)
        if entry:
            elapsed = time.time() - entry.get("last_requested_at", 0)
            if elapsed < cooldown:
                return False, int(cooldown - elapsed)

        return True, 0

    def generate_otp(self, email: str, purpose: str, db: Optional[Session] = None) -> str:
        """Generate a random 6-digit numeric OTP and store its salted hash in DB and memory."""
        clean_email = email.lower().strip()
        clean_purpose = purpose.lower().strip()

        # 6-digit random code: 100000 - 999999
        otp_code = str(secrets.randbelow(900000) + 100000)
        salt = secrets.token_hex(16)
        hashed_otp = self._hash_otp(otp_code, salt)
        expires_at_dt = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        # Store in memory
        key = self._get_key(clean_email, clean_purpose)
        self._otp_store[key] = {
            "hash": hashed_otp,
            "salt": salt,
            "expires_at": time.time() + (settings.OTP_EXPIRE_MINUTES * 60),
            "last_requested_at": time.time(),
            "attempts": 0,
        }

        # Persist to database
        should_close_db = False
        if db is None:
            db = SessionLocal()
            should_close_db = True

        try:
            # Mark older unconsumed OTPs for this email/purpose as consumed
            db.query(EmailOTP).filter(
                EmailOTP.email == clean_email,
                EmailOTP.purpose == clean_purpose,
                EmailOTP.is_consumed == False,
            ).update({"is_consumed": True})

            otp_record = EmailOTP(
                email=clean_email,
                purpose=clean_purpose,
                otp_hash=hashed_otp,
                salt=salt,
                expires_at=expires_at_dt,
                created_at=datetime.utcnow(),
                attempts=0,
                is_consumed=False,
            )
            db.add(otp_record)
            db.commit()
        except Exception as e:
            logger.error(f"[OTP] Database error saving OTP for {clean_email}: {e}")
            db.rollback()
        finally:
            if should_close_db:
                db.close()

        logger.info(f"[OTP] Generated OTP for {clean_email} (purpose={clean_purpose}), expires in {settings.OTP_EXPIRE_MINUTES} min")
        return otp_code

    def verify_otp(self, email: str, otp_code: str, purpose: str, consume: bool = True, db: Optional[Session] = None) -> Tuple[bool, str]:
        """Verify the provided OTP against database and memory store."""
        clean_email = email.lower().strip()
        clean_purpose = purpose.lower().strip()
        clean_otp = otp_code.strip()

        should_close_db = False
        if db is None:
            db = SessionLocal()
            should_close_db = True

        try:
            # Check DB record
            record = (
                db.query(EmailOTP)
                .filter(
                    EmailOTP.email == clean_email,
                    EmailOTP.purpose == clean_purpose,
                    EmailOTP.is_consumed == False,
                )
                .order_by(EmailOTP.created_at.desc())
                .first()
            )

            if record:
                if datetime.utcnow() > record.expires_at:
                    record.is_consumed = True
                    db.commit()
                    return False, "OTP has expired. Please request a new code."

                record.attempts += 1
                if record.attempts > 5:
                    record.is_consumed = True
                    db.commit()
                    return False, "Too many failed attempts. Please request a new OTP."

                provided_hash = self._hash_otp(clean_otp, record.salt)
                if hmac.compare_digest(record.otp_hash, provided_hash):
                    if consume:
                        record.is_consumed = True
                        key = self._get_key(clean_email, clean_purpose)
                        self._otp_store.pop(key, None)
                    db.commit()
                    logger.info(f"[OTP] Verification SUCCESS for {clean_email} (purpose={clean_purpose}, consumed={consume})")
                    return True, "Verification successful."
                else:
                    db.commit()
                    logger.info(f"[OTP] Verification FAILED for {clean_email} (purpose={clean_purpose}) — invalid code")
                    return False, "Invalid verification code. Please check your email."

        except Exception as e:
            logger.error(f"[OTP] Database error during verification for {clean_email}: {e}")
        finally:
            if should_close_db:
                db.close()

        # Fallback to in-memory verification
        key = self._get_key(clean_email, clean_purpose)
        entry = self._otp_store.get(key)
        if not entry:
            return False, "No OTP request found for this email. Please request a new code."

        if time.time() > entry.get("expires_at", 0):
            self._otp_store.pop(key, None)
            return False, "OTP has expired. Please request a new code."

        entry["attempts"] = entry.get("attempts", 0) + 1
        if entry["attempts"] > 5:
            self._otp_store.pop(key, None)
            return False, "Too many failed attempts. Please request a new OTP."

        salt = entry.get("salt", "")
        expected_hash = entry.get("hash", "")
        provided_hash = self._hash_otp(clean_otp, salt)

        if hmac.compare_digest(expected_hash, provided_hash):
            if consume:
                self._otp_store.pop(key, None)
            return True, "Verification successful."

        return False, "Invalid verification code. Please check your email."

    def invalidate_failed_otp(self, email: str, purpose: str, db: Optional[Session] = None) -> None:
        """Remove or invalidate an OTP that failed to dispatch so the user is not locked by cooldown."""
        clean_email = email.lower().strip()
        clean_purpose = purpose.lower().strip()

        # Clear from in-memory cache
        key = self._get_key(clean_email, clean_purpose)
        self._otp_store.pop(key, None)

        should_close_db = False
        if db is None:
            db = SessionLocal()
            should_close_db = True

        try:
            # Delete unconsumed OTP records for this email and purpose created within the last 2 minutes
            recent_cutoff = datetime.utcnow() - timedelta(minutes=2)
            db.query(EmailOTP).filter(
                EmailOTP.email == clean_email,
                EmailOTP.purpose == clean_purpose,
                EmailOTP.is_consumed == False,
                EmailOTP.created_at >= recent_cutoff,
            ).delete(synchronize_session=False)
            db.commit()
            logger.info(f"[OTP] Cleaned up failed OTP dispatch for {clean_email} ({clean_purpose})")
        except Exception as e:
            logger.warning(f"[OTP] Notice during failed OTP cleanup for {clean_email}: {e}")
            db.rollback()
        finally:
            if should_close_db:
                db.close()

    def _send_via_resend(
        self,
        to_email: str,
        otp_code: str,
        purpose_label: str,
        subject: str,
        html_content: str,
        plain_text: str,
    ) -> bool:
        """Dispatch OTP email using Resend HTTPS API."""
        api_key = (settings.RESEND_API_KEY or "").strip()
        if not api_key:
            logger.error(f"[Resend Error] RESEND_API_KEY is not configured. Cannot dispatch OTP to {to_email}.")
            return False

        from_email = (settings.RESEND_FROM_EMAIL or "").strip()
        if not from_email:
            from_email = "onboarding@resend.dev"

        from_name = (settings.RESEND_FROM_NAME or settings.SMTP_FROM_NAME or "ClassAbly").strip()
        from_header = f"{from_name} <{from_email}>" if from_name else from_email

        params = {
            "from": from_header,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": plain_text,
        }

        try:
            import resend
            resend.api_key = api_key
            response = resend.Emails.send(params)

            res_id = ""
            if isinstance(response, dict):
                res_id = response.get("id", "")
                if "error" in response or "statusCode" in response:
                    err_msg = response.get("message") or response.get("error") or "Unknown Resend API error"
                    logger.error(f"[Resend] Failed to send OTP to {to_email}: {err_msg}")
                    return False
            elif hasattr(response, "id"):
                res_id = str(getattr(response, "id", "") or "")

            if res_id:
                logger.info(f"[Resend] Successfully dispatched OTP to {to_email} (id: {res_id})")
            else:
                logger.info(f"[Resend] Successfully dispatched OTP to {to_email}")
            return True

        except Exception as e:
            logger.error(f"[Resend] Failed to send OTP to {to_email}: {e}")
            return False

    def _send_via_smtp(
        self,
        to_email: str,
        otp_code: str,
        purpose: str,
        subject: str,
        html_content: str,
        plain_text: str,
    ) -> bool:
        """Dispatch OTP email using Gmail SMTP with SSL/TLS and retry logic."""
        smtp_user = (settings.SMTP_USER or "").strip()
        smtp_password = (settings.SMTP_PASSWORD or "").strip().replace(" ", "").strip('"').strip("'")
        smtp_host = (settings.SMTP_HOST or "smtp.gmail.com").strip()
        smtp_port = int(settings.SMTP_PORT or 465)
        from_name = (settings.SMTP_FROM_NAME or "ClassAbly").strip()
        from_email = (settings.SMTP_FROM_EMAIL or smtp_user).strip()

        if not smtp_user or not smtp_password:
            logger.error(f"[Gmail SMTP Error] SMTP credentials not configured (SMTP_USER/SMTP_PASSWORD missing). Cannot send email to {to_email}.")
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        last_error = None
        for attempt in range(2):
            try:
                if smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                        server.ehlo()
                        server.starttls()
                        server.ehlo()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)

                logger.info(f"[Gmail SMTP] Successfully dispatched OTP to {to_email} for {purpose}")
                return True

            except Exception as e:
                last_error = e
                logger.warning(f"[Gmail SMTP Attempt {attempt+1}/2] Failed to send email to {to_email}: {e}")
                if attempt == 0:
                    time.sleep(1.5)

        logger.error(f"[Gmail SMTP Error] All attempts failed to send email to {to_email}: {last_error}")
        return False

    def send_otp_email(self, to_email: str, otp_code: str, purpose: str = "Verification") -> bool:
        """Send the OTP via configured provider (Resend HTTPS API or Gmail SMTP)."""
        clean_to_email = to_email.lower().strip()
        provider = (settings.EMAIL_PROVIDER or "smtp").lower().strip()
        logger.info(f"[Email Service] Provider: {provider}")

        # Explicit mock email mode (only when MOCK_EMAIL_IN_DEV is enabled for dev/testing)
        if settings.MOCK_EMAIL_IN_DEV:
            logger.info(f"[Mock Email Service] OTP for {clean_to_email} ({purpose}): {otp_code}")
            return True

        from_name = (
            settings.RESEND_FROM_NAME if provider == "resend" else settings.SMTP_FROM_NAME
        ) or "ClassAbly"
        from_name = from_name.strip()

        purpose_label = (
            "Account Registration" if purpose == "register"
            else "Secure Account Login" if purpose == "login"
            else "Password Reset" if purpose in ["reset_password", "forgot_password"]
            else purpose.capitalize()
        )
        subject = f"{otp_code} is your {from_name} Verification Code"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }}
                .container {{ max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
                .header {{ text-align: center; margin-bottom: 24px; }}
                .logo {{ display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #4f46e5); color: #fff; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 8px; }}
                .title {{ font-size: 20px; font-weight: bold; color: #f1f5f9; margin: 0; }}
                .subtitle {{ font-size: 13px; color: #94a3b8; margin-top: 4px; }}
                .otp-box {{ background: #0f172a; border: 2px dashed #38bdf8; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
                .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }}
                .otp-desc {{ font-size: 12px; color: #64748b; margin-top: 8px; }}
                .badge {{ display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 8px; }}
                .info {{ font-size: 13px; line-height: 1.6; color: #cbd5e1; }}
                .footer {{ text-align: center; font-size: 11px; color: #64748b; margin-top: 28px; border-top: 1px solid #334155; padding-top: 16px; }}
                .warning {{ font-size: 11px; color: #f87171; margin-top: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">C</div>
                    <h1 class="title">{from_name}</h1>
                    <p class="subtitle">Smart Classroom Accessibility Platform</p>
                </div>

                <div style="text-align: center;">
                    <span class="badge">{purpose_label}</span>
                </div>

                <p class="info">Hello,</p>
                <p class="info">You requested a one-time verification code for <strong>{clean_to_email}</strong> on ClassAbly. Use the code below to complete your {purpose_label.lower()}:</p>

                <div class="otp-box">
                    <div class="otp-code">{otp_code}</div>
                    <div class="otp-desc">Valid for the next {settings.OTP_EXPIRE_MINUTES} minutes</div>
                </div>

                <p class="info">If you did not request this code, you can safely ignore this email. Do not share this code with anyone.</p>
                <p class="warning">⚠️ ClassAbly staff will never ask you for your verification code or password.</p>

                <div class="footer">
                    &copy; {datetime.utcnow().year} ClassAbly Platform. All rights reserved.<br>
                    Automated authentication message. Please do not reply.
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"Your ClassAbly {purpose_label} code is: {otp_code}\nValid for {settings.OTP_EXPIRE_MINUTES} minutes.\nDo not share this code."

        if provider == "resend":
            return self._send_via_resend(
                to_email=clean_to_email,
                otp_code=otp_code,
                purpose_label=purpose_label,
                subject=subject,
                html_content=html_content,
                plain_text=plain_text,
            )
        elif provider == "smtp":
            return self._send_via_smtp(
                to_email=clean_to_email,
                otp_code=otp_code,
                purpose=purpose,
                subject=subject,
                html_content=html_content,
                plain_text=plain_text,
            )
        else:
            logger.error(f"[Email Service] Unknown EMAIL_PROVIDER '{provider}'. Supported providers: 'smtp', 'resend'.")
            return False


email_otp_service = EmailOTPService()

