from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from api.auth import get_current_user
from models.models import User, PushSubscription
from config import settings
import json
import logging
import pywebpush

logger = logging.getLogger(__name__)
router = APIRouter()

class SubscriptionRequest(BaseModel):
    endpoint: str
    keys: dict

@router.post("/subscribe")
async def subscribe_notification(
    sub: SubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.endpoint == sub.endpoint
    ).first()
    
    if existing:
        return {"status": "already subscribed"}

    keys = sub.keys or {}
    new_sub = PushSubscription(
        user_id=current_user.id,
        endpoint=sub.endpoint,
        p256dh=keys.get("p256dh", ""),
        auth_key=keys.get("auth", "")
    )
    db.add(new_sub)
    db.commit()
    return {"status": "subscribed"}

def send_push_notification(subscription_info: dict, payload: dict):
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("VAPID keys missing. Cannot send web push.")
        return False
        
    try:
        pywebpush.webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={
                "sub": f"mailto:{settings.vapid_subject_email}"
            }
        )
        return True
    except pywebpush.WebPushException as ex:
        logger.error(f"WebPushException: {repr(ex)}")
        if ex.response and ex.response.json():
            logger.error(ex.response.json())
        return False

@router.post("/test_dispatch")
async def test_dispatch(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    if not subs:
        raise HTTPException(status_code=404, detail="No subscriptions found")
        
    payload = {
        "title": "CareerGPT Test",
        "body": "This is a test web push notification from CareerGPT!",
        "icon": "/pwa-192x192.png",
        "url": "/dashboard"
    }
    
    for sub in subs:
        sub_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth_key
            }
        }
        background_tasks.add_task(send_push_notification, sub_info, payload)
        
    return {"status": "dispatched", "count": len(subs)}
