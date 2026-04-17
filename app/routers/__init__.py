from fastapi import APIRouter

from app.routers import (
    admin,
    auth_google,
    auth_instagram_basic,
    auth_meta,
    customers,
    instagram_accounts,
    ai,
    flows,
    campaigns,
    media,
    webhooks,
    contacts,
    verification,
    admin_auth,
    upload,
    subscription,
    internal_tasks,
    ses_webhooks,
)

api_router = APIRouter()

api_router.include_router(internal_tasks.router, prefix="/internal", tags=["internal"])
api_router.include_router(auth_meta.router, prefix="/auth/meta", tags=["auth"])
api_router.include_router(auth_google.router, prefix="/auth/google", tags=["auth"])
api_router.include_router(auth_instagram_basic.router, prefix="/auth/instagram-basic", tags=["auth"])
api_router.include_router(admin_auth.router, tags=["admin-auth"]) # /auth/signup, /auth/login
api_router.include_router(customers.router, prefix="/admin/customers", tags=["customers"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(instagram_accounts.router, prefix="/instagram", tags=["instagram"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(flows.router, prefix="/instagram", tags=["flows"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(webhooks.router, prefix="/instagram", tags=["webhooks"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
api_router.include_router(verification.router, tags=["verification"]) # /api/verification/verify-email
api_router.include_router(upload.router, prefix="/api", tags=["upload"])
api_router.include_router(subscription.router, prefix="/api", tags=["subscription"])
api_router.include_router(ses_webhooks.router)

