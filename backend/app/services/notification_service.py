from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.models.user import User
from app.services.outreach_service import send_email_outreach

async def create_notification(
    db: AsyncSession,
    user: User,
    type: str,
    title: str,
    message: str,
    link: str = None,
) -> Notification:
    notif = Notification(
        user_id=user.id,
        type=type,
        title=title,
        message=message,
        link=link
    )
    db.add(notif)
    await db.flush()

    # Send email if preference includes email
    if user.notification_preference in ("email", "both"):
        await send_email_outreach(
            to_email=user.email,
            subject=f"PitchLocal: {title}",
            body=message
        )

    return notif
