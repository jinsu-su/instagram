from uuid import UUID
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.automation_activity import AutomationActivity
from app.models.contact import Contact
from app.utils.logging import get_logger

logger = get_logger(__name__)

class ActivityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_activity(
        self,
        customer_id: UUID,
        event_type: str,
        trigger_source: str,
        contact_id: Optional[UUID] = None,
        trigger_text: Optional[str] = None,
        action_text: Optional[str] = None,
        intent: Optional[str] = None,
        status: str = "SUCCESS"
    ):
        """Logs an automation activity to the database."""
        try:
            activity = AutomationActivity(
                customer_id=customer_id,
                contact_id=contact_id,
                event_type=event_type,
                trigger_source=trigger_source,
                trigger_text=trigger_text,
                action_text=action_text,
                intent=intent,
                status=status
            )
            self.db.add(activity)
            await self.db.commit()
            logger.info(f"Logged {event_type} activity for customer {customer_id}")
            return activity
        except Exception as e:
            logger.error(f"Failed to log activity: {e}")
            await self.db.rollback()
            return None

    async def get_recent_activities(self, customer_id: UUID, limit: int = 20) -> List[dict]:
        """Fetches recent activities for the dashboard, including contact usernames."""
        try:
            # Join with Contact to get the username
            query = select(
                AutomationActivity,
                Contact.username.label("contact_username")
            ).join(
                Contact, AutomationActivity.contact_id == Contact.id, isouter=True
            ).where(
                AutomationActivity.customer_id == customer_id
            ).order_by(
                AutomationActivity.created_at.desc()
            ).limit(limit)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            activities = []
            for row in rows:
                activity = row[0]
                contact_username = row[1]
                
                # We need to return a dict or object that pydantic can parse
                # including the 'contact_username' field
                activity_dict = {
                    "id": activity.id,
                    "contact_id": activity.contact_id,
                    "event_type": activity.event_type,
                    "trigger_source": activity.trigger_source,
                    "trigger_text": activity.trigger_text,
                    "action_text": activity.action_text,
                    "intent": activity.intent,
                    "status": activity.status,
                    "created_at": activity.created_at,
                    "contact_username": contact_username
                }
                activities.append(activity_dict)
                
            return activities
        except Exception as e:
            logger.error(f"Failed to fetch activities: {e}")
            return []
