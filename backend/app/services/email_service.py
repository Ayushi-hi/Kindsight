"""
Sends transactional emails (password reset, email verification) via Gmail
SMTP. Uses smtplib directly - no external email API dependency. Requires a
Gmail App Password (not the account's normal password) set as
SMTP_PASSWORD in .env - see https://myaccount.google.com/apppasswords.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, to_email, message.as_string())


def send_password_reset_email(to_email: str, token: str) -> None:
    reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Reset your Kindsight password</h2>
        <p>We received a request to reset your password. Click the link below to choose a new one.</p>
        <p><a href="{reset_link}" style="display: inline-block; background: #4F46E5; color: white;
            padding: 10px 20px; border-radius: 999px; text-decoration: none;">Reset password</a></p>
        <p style="color: #6B7280; font-size: 13px;">This link expires in
            {settings.reset_token_expire_minutes} minutes. If you didn't request this, you can safely
            ignore this email.</p>
    </div>
    """
    _send_email(to_email, "Reset your Kindsight password", html_body)


def send_verification_email(to_email: str, token: str) -> None:
    verify_link = f"{settings.frontend_base_url}/verify-email?token={token}"
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Verify your Kindsight email</h2>
        <p>Thanks for signing up. Please confirm this is your email address to finish setting up your account.</p>
        <p><a href="{verify_link}" style="display: inline-block; background: #4F46E5; color: white;
            padding: 10px 20px; border-radius: 999px; text-decoration: none;">Verify email</a></p>
        <p style="color: #6B7280; font-size: 13px;">This link expires in
            {settings.verification_token_expire_hours} hours.</p>
    </div>
    """
    _send_email(to_email, "Verify your Kindsight email", html_body)