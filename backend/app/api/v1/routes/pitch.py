from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.business import Business
from app.models.lead import Lead
from app.models.pitch import OutreachLog, Pitch
from app.models.pitch import PitchMethod as ModelPitchMethod
from app.models.user import User, UserTier
from app.schemas.pitch import (
    AIAnglesResponse,
    OutreachLogCreate,
    OutreachLogResponse,
    PitchAngle,
    PitchGenerateRequest,
    PitchMethod,
    PitchResponse,
    PitchUpdate,
)
from app.services.anthropic_service import generate_pitch_angles
from app.services.outreach_service import send_email_outreach

router = APIRouter()

FREE_AI_PITCH_MONTHLY_LIMIT = 5


class SendPitchBody(BaseModel):
    to_email: str


async def _check_ai_limit(user: User, db: AsyncSession) -> None:
    if user.tier == UserTier.PRO:
        return
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(func.count())
        .select_from(Pitch)
        .where(
            Pitch.user_id == user.id,
            Pitch.method == ModelPitchMethod.AI,
            extract("year", Pitch.created_at) == now.year,
            extract("month", Pitch.created_at) == now.month,
        )
    )
    if result.scalar() >= FREE_AI_PITCH_MONTHLY_LIMIT:
        raise HTTPException(
            status_code=402, detail="Monthly AI pitch limit reached. Upgrade to Pro."
        )


async def _load_lead(lead_id: UUID, user_id, db: AsyncSession) -> Lead:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.user_id == user_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


async def _ai_content(lead: Lead, db: AsyncSession) -> dict:
    biz_name = biz_category = biz_desc = ""
    if lead.business_id:
        biz = (
            await db.execute(select(Business).where(Business.id == lead.business_id))
        ).scalar_one_or_none()
        if biz:
            biz_name = biz.name or ""
            biz_category = biz.category or ""
            biz_desc = biz.description or ""
    return await generate_pitch_angles(
        business_name=biz_name or "Online Lead",
        business_category=biz_category,
        business_description=biz_desc or (lead.source_content or ""),
        freelancer_service="freelance services",
    )


@router.post("/generate", response_model=AIAnglesResponse)
async def generate_angles(
    body: PitchGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return AI-generated angles without saving a Pitch record."""
    await _check_ai_limit(current_user, db)
    lead = await _load_lead(body.lead_id, current_user.id, db)
    result = await _ai_content(lead, db)
    raw_angles = result.get("angles", [])
    angles = [
        PitchAngle(title=a, description="") if isinstance(a, str) else PitchAngle(**a)
        for a in raw_angles
    ]
    return AIAnglesResponse(
        angles=angles,
        suggested_pitch=result["suggested_pitch"],
        subject_line=result.get("subject", ""),
    )


@router.post("/", response_model=PitchResponse, status_code=201)
async def create_pitch(
    body: PitchGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead = await _load_lead(body.lead_id, current_user.id, db)

    content = body.content
    subject = body.subject
    angles = None

    if body.method == PitchMethod.AI:
        await _check_ai_limit(current_user, db)
        ai = await _ai_content(lead, db)
        content = ai["suggested_pitch"]
        angles = ai.get("angles")
        subject = subject or ai.get("subject")
    elif not content:
        raise HTTPException(status_code=422, detail="content is required for manual pitches")

    pitch = Pitch(
        user_id=current_user.id,
        lead_id=body.lead_id,
        method=ModelPitchMethod(body.method.value),
        content=content,
        angles=angles,
        subject=subject,
    )
    db.add(pitch)
    await db.flush()
    return pitch


@router.get("/lead/{lead_id}", response_model=list[PitchResponse])
async def get_pitches_for_lead(
    lead_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _load_lead(lead_id, current_user.id, db)
    result = await db.execute(
        select(Pitch)
        .where(Pitch.lead_id == lead_id)
        .order_by(Pitch.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{pitch_id}", response_model=PitchResponse)
async def get_pitch(
    pitch_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pitch).where(Pitch.id == pitch_id, Pitch.user_id == current_user.id)
    )
    pitch = result.scalar_one_or_none()
    if not pitch:
        raise HTTPException(status_code=404, detail="Pitch not found")
    return pitch


@router.patch("/{pitch_id}", response_model=PitchResponse)
async def update_pitch(
    pitch_id: UUID,
    body: PitchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pitch).where(Pitch.id == pitch_id, Pitch.user_id == current_user.id)
    )
    pitch = result.scalar_one_or_none()
    if not pitch:
        raise HTTPException(status_code=404, detail="Pitch not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(pitch, field, value)
    await db.flush()
    return pitch


@router.post("/{pitch_id}/send", response_model=OutreachLogResponse)
async def send_pitch(
    pitch_id: UUID,
    body: SendPitchBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pitch).where(Pitch.id == pitch_id, Pitch.user_id == current_user.id)
    )
    pitch = result.scalar_one_or_none()
    if not pitch:
        raise HTTPException(status_code=404, detail="Pitch not found")

    success = await send_email_outreach(
        to_email=body.to_email,
        subject=pitch.subject or "An offer for your business",
        body=pitch.content,
    )

    log = OutreachLog(
        lead_id=pitch.lead_id,
        pitch_id=pitch.id,
        method="email",
        status="sent" if success else "failed",
    )
    db.add(log)
    pitch.sent = True
    await db.flush()
    return log
