from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.routes import auth, users, businesses, pitch, pipeline, leads, notifications, profile

app = FastAPI(
    title="PitchLocal API",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(businesses.router, prefix="/api/v1/businesses", tags=["Businesses"])
app.include_router(pitch.router, prefix="/api/v1/pitch", tags=["Pitch"])
app.include_router(pipeline.router, prefix="/api/v1/pipeline", tags=["Pipeline"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["Leads"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])

@app.get("/health")
async def health():
    return {"status": "ok", "app": "PitchLocal"}
