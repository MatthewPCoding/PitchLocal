from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.lead import Lead, LeadStatus
from app.models.monitor import Monitor
from app.models.pipeline import Project
from app.models.user import User, UserTier
from app.schemas.pipeline import (
    MonitorCreate,
    MonitorResponse,
    MonitorUpdate,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter()

FREE_MONITOR_LIMIT = 2


# ── Projects ──────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .join(Lead, Project.lead_id == Lead.id)
        .where(Lead.user_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead_result = await db.execute(
        select(Lead).where(Lead.id == body.lead_id, Lead.user_id == current_user.id)
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = LeadStatus.LANDED

    project = Project(**body.model_dump())
    db.add(project)
    await db.flush()
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .join(Lead, Project.lead_id == Lead.id)
        .where(Project.id == project_id, Lead.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .join(Lead, Project.lead_id == Lead.id)
        .where(Project.id == project_id, Lead.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    return project


# ── Monitors ──────────────────────────────────────────────────────────────────

@router.get("/monitors", response_model=list[MonitorResponse])
async def list_monitors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Monitor)
        .where(Monitor.user_id == current_user.id)
        .order_by(Monitor.created_at.desc())
    )
    return result.scalars().all()


@router.post("/monitors", response_model=MonitorResponse, status_code=201)
async def create_monitor(
    body: MonitorCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.tier != UserTier.PRO:
        count = (
            await db.execute(
                select(func.count())
                .select_from(Monitor)
                .where(Monitor.user_id == current_user.id)
            )
        ).scalar()
        if count >= FREE_MONITOR_LIMIT:
            raise HTTPException(
                status_code=402, detail="Monitor limit reached. Upgrade to Pro."
            )

    monitor = Monitor(user_id=current_user.id, **body.model_dump())
    db.add(monitor)
    await db.flush()
    return monitor


@router.patch("/monitors/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(
    monitor_id: UUID,
    body: MonitorUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Monitor).where(Monitor.id == monitor_id, Monitor.user_id == current_user.id)
    )
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(monitor, field, value)
    await db.flush()
    return monitor


@router.delete("/monitors/{monitor_id}", status_code=204)
async def delete_monitor(
    monitor_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Monitor).where(Monitor.id == monitor_id, Monitor.user_id == current_user.id)
    )
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    await db.delete(monitor)
