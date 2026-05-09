import aiosmtplib
from email.message import EmailMessage
from app.core.config import settings

async def send_email_outreach(
    to_email: str,
    subject: str,
    body: str,
    from_name: str = "PitchLocal"
) -> bool:
    """Send a pitch email on behalf of the freelancer."""
    try:
        message = EmailMessage()
        message["From"] = f"{from_name} <{settings.SMTP_USER}>"
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False
