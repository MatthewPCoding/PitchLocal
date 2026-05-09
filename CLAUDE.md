# PitchLocal — Developer Handoff

## What This Is
A B2B lead gen + CRM platform for freelancers (devs, brand scalers, etc.) to find local businesses and online leads, generate AI-powered pitches, and track their outreach pipeline.

## Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TailwindCSS |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL (Supabase free tier) |
| Auth | JWT (email/password, Google OAuth planned) |
| AI | Anthropic Claude API |
| Business Data | Google Places API |
| Reddit | PRAW (read-only) |
| Discord | discord.py bot |
| Email | aiosmtplib (Gmail SMTP) |
| Hosting | Render (backend), Vercel (frontend) |

## Monorepo Structure
```
pitchlocal/
├── frontend/          # React app
│   └── src/
│       ├── components/
│       │   ├── auth/          # Login, Register, PasswordStrength
│       │   ├── business/      # BusinessSearch, BusinessCard, BusinessDetail
│       │   ├── pitch/         # PitchGenerator, PitchEditor, AngleList
│       │   ├── pipeline/      # PipelineBoard, LeadCard, OutreachLog
│       │   ├── profile/       # FreelancerProfile, ResumeUpload, ServicesList
│       │   └── shared/        # Navbar, Sidebar, Modal, Notification, PaywallBanner
│       ├── pages/             # Route-level page components
│       ├── hooks/             # Custom React hooks
│       ├── context/           # AuthContext, NotificationContext
│       ├── services/          # API call functions per domain
│       └── utils/             # validators, formatters, constants
├── backend/           # FastAPI app
│   └── app/
│       ├── api/v1/routes/     # One file per domain (auth, users, businesses, etc.)
│       ├── core/              # config.py, security.py, dependencies.py
│       ├── db/                # database.py (async SQLAlchemy + Supabase)
│       ├── models/            # SQLAlchemy ORM models
│       ├── schemas/           # Pydantic request/response schemas
│       ├── services/          # Business logic (anthropic, business, reddit, etc.)
│       └── utils/             # password, email, location helpers
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Key Models
- **User** — freelancer account, tier (free/pro), location, mile_range, notification pref
- **Business** — cached Google Places data
- **Lead** — links user to a business or online post, tracks status
- **Pitch** — AI or manual pitch content + angles, linked to a lead
- **OutreachLog** — records each outreach attempt and response
- **Project** — created when a lead is "landed" (rate, dates, duration)
- **Notification** — in-app and email notifications
- **Monitor** — Reddit/Discord watchers per user

## Lead Status Flow
NEW → PITCHED → INTERESTED → LANDED (or REJECTED at any point)

## Auth Flow
1. Register with email/password (password strength enforced frontend + backend)
2. JWT access token (60min) + refresh token (30 days)
3. `get_current_user` dependency on all protected routes
4. `require_pro` dependency on paywalled features

## Freemium Gates (enforce via `require_pro` dependency)
- AI pitch generation: 5/month free, unlimited pro
- Lead monitors: 2 free, unlimited pro
- Business searches: 10/day free, unlimited pro

## AI Pitch Generation Flow
1. User selects a business lead
2. Chooses AI or Manual
3. If AI: `anthropic_service.generate_pitch_angles()` analyzes business category,
   reviews, and returns angles + a suggested pitch + subject line
4. User edits if needed
5. Pitch sent via email (`outreach_service.send_email_outreach()`) or logged as manual

## Online Lead Monitoring Flow
1. User creates a Monitor (platform, target subreddit/channel, keywords)
2. APScheduler runs `reddit_service.search_subreddit()` on interval
3. New matches create Lead records + trigger Notification

## Environment Variables
See `backend/.env.example` and `frontend/.env.example` for full list.
Key ones: DATABASE_URL, SECRET_KEY, ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY,
REDDIT_CLIENT_ID/SECRET, SMTP_USER/PASSWORD

## Local Dev Setup
```bash
# Start everything
docker-compose up

# Backend only
cd backend && uvicorn app.main:app --reload

# Frontend only
cd frontend && npm install && npm run dev
```

## What's Not Built Yet (implement in order)
1. Pydantic schemas (backend/app/schemas/)
2. Route handlers (backend/app/api/v1/routes/)
3. Alembic migrations
4. Frontend Auth flow (Login/Register with PasswordStrength component)
5. Business search UI + Google Places integration
6. Pitch generator UI + Anthropic integration
7. Pipeline board (kanban-style lead tracker)
8. Monitor setup UI (Reddit/Discord keyword watchers)
9. Notifications panel
10. Freelancer profile page
11. Stripe paywall integration (pro tier)
12. Google OAuth (planned for v2)
