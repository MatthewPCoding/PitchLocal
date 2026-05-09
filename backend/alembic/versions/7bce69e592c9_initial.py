"""initial

Revision ID: 7bce69e592c9
Revises:
Create Date: 2026-05-09 15:04:31.377554

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '7bce69e592c9'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Pre-built enum type references (create_type=False = don't emit DDL for these,
# op.execute() handles CREATE/DROP TYPE explicitly so both online and offline
# SQL are clean and idempotent-friendly).
_usertier    = postgresql.ENUM('free', 'pro',                                       name='usertier',    create_type=False)
_leadsource  = postgresql.ENUM('local', 'reddit', 'discord',                        name='leadsource',  create_type=False)
_leadstatus  = postgresql.ENUM('new', 'pitched', 'interested', 'rejected', 'landed', name='leadstatus',  create_type=False)
_pitchmethod = postgresql.ENUM('ai', 'manual',                                      name='pitchmethod', create_type=False)


def upgrade() -> None:
    # ── Enum types ────────────────────────────────────────────────────────────
    op.execute("CREATE TYPE usertier    AS ENUM ('free', 'pro')")
    op.execute("CREATE TYPE leadsource  AS ENUM ('local', 'reddit', 'discord')")
    op.execute("CREATE TYPE leadstatus  AS ENUM ('new', 'pitched', 'interested', 'rejected', 'landed')")
    op.execute("CREATE TYPE pitchmethod AS ENUM ('ai', 'manual')")

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id',                      postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email',                   sa.String(),  nullable=False),
        sa.Column('password_hash',           sa.String(),  nullable=False),
        sa.Column('full_name',               sa.String(),  nullable=False),
        sa.Column('tier',                    _usertier,    nullable=False, server_default='free'),
        sa.Column('is_active',               sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_verified',          sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('city',                    sa.String(),  nullable=True),
        sa.Column('state',                   sa.String(),  nullable=True),
        sa.Column('lat',                     sa.Float(),   nullable=True),
        sa.Column('lng',                     sa.Float(),   nullable=True),
        sa.Column('mile_range',              sa.Float(),   nullable=False, server_default='25.0'),
        sa.Column('notification_preference', sa.String(),  nullable=False, server_default='both'),
        sa.Column('created_at',              sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at',              sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── businesses ────────────────────────────────────────────────────────────
    op.create_table(
        'businesses',
        sa.Column('id',              postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('google_place_id', sa.String(), nullable=True),
        sa.Column('name',            sa.String(), nullable=False),
        sa.Column('category',        sa.String(), nullable=True),
        sa.Column('address',         sa.String(), nullable=True),
        sa.Column('city',            sa.String(), nullable=True),
        sa.Column('state',           sa.String(), nullable=True),
        sa.Column('lat',             sa.Float(),  nullable=True),
        sa.Column('lng',             sa.Float(),  nullable=True),
        sa.Column('phone',           sa.String(), nullable=True),
        sa.Column('email',           sa.String(), nullable=True),
        sa.Column('website',         sa.String(), nullable=True),
        sa.Column('rating',          sa.Float(),  nullable=True),
        sa.Column('review_count',    sa.Float(),  nullable=True),
        sa.Column('description',     sa.Text(),   nullable=True),
        sa.Column('cached_at',       sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.UniqueConstraint('google_place_id', name='uq_businesses_google_place_id'),
    )
    op.create_index('ix_businesses_google_place_id', 'businesses', ['google_place_id'], unique=True)

    # ── leads ─────────────────────────────────────────────────────────────────
    op.create_table(
        'leads',
        sa.Column('id',             postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',        postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('business_id',    postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('source',         _leadsource, nullable=False),
        sa.Column('status',         _leadstatus, nullable=False, server_default='new'),
        sa.Column('source_url',     sa.String(), nullable=True),
        sa.Column('source_content', sa.Text(),   nullable=True),
        sa.Column('notes',          sa.Text(),   nullable=True),
        sa.Column('created_at',     sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at',     sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'],     ['users.id'],      name='fk_leads_user_id'),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], name='fk_leads_business_id'),
    )

    # ── pitches ───────────────────────────────────────────────────────────────
    op.create_table(
        'pitches',
        sa.Column('id',         postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',    postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id',    postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('method',     _pitchmethod, nullable=False),
        sa.Column('content',    sa.Text(),    nullable=False),
        sa.Column('angles',     postgresql.JSONB(), nullable=True),
        sa.Column('subject',    sa.String(),  nullable=True),
        sa.Column('sent',       sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_pitches_user_id'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], name='fk_pitches_lead_id'),
    )

    # ── outreach_logs ─────────────────────────────────────────────────────────
    op.create_table(
        'outreach_logs',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id',      postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pitch_id',     postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('method',       sa.String(), nullable=False),
        sa.Column('status',       sa.String(), nullable=False, server_default='sent'),
        sa.Column('response',     sa.Text(),   nullable=True),
        sa.Column('sent_at',      sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['lead_id'],  ['leads.id'],   name='fk_outreach_logs_lead_id'),
        sa.ForeignKeyConstraint(['pitch_id'], ['pitches.id'], name='fk_outreach_logs_pitch_id'),
    )

    # ── projects ──────────────────────────────────────────────────────────────
    op.create_table(
        'projects',
        sa.Column('id',             postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id',        postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title',          sa.String(), nullable=False),
        sa.Column('description',    sa.Text(),   nullable=True),
        sa.Column('is_paid',        sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('rate',           sa.Float(),  nullable=True),
        sa.Column('rate_type',      sa.String(), nullable=True),
        sa.Column('start_date',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date',       sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_weeks', sa.Float(),  nullable=True),
        sa.Column('status',         sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at',     sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], name='fk_projects_lead_id'),
        sa.UniqueConstraint('lead_id', name='uq_projects_lead_id'),
    )

    # ── notifications ─────────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id',         postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',    postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type',       sa.String(),  nullable=False),
        sa.Column('title',      sa.String(),  nullable=False),
        sa.Column('message',    sa.Text(),    nullable=False),
        sa.Column('read',       sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('link',       sa.String(),  nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_notifications_user_id'),
    )

    # ── monitors ──────────────────────────────────────────────────────────────
    op.create_table(
        'monitors',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',      postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform',     sa.String(), nullable=False),
        sa.Column('target',       sa.String(), nullable=False),
        sa.Column('keywords',     postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('active',       sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_checked', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at',   sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_monitors_user_id'),
    )


def downgrade() -> None:
    op.drop_table('monitors')
    op.drop_table('notifications')
    op.drop_table('projects')
    op.drop_table('outreach_logs')
    op.drop_table('pitches')
    op.drop_table('leads')
    op.drop_table('businesses')
    op.drop_table('users')

    op.execute("DROP TYPE pitchmethod")
    op.execute("DROP TYPE leadstatus")
    op.execute("DROP TYPE leadsource")
    op.execute("DROP TYPE usertier")
