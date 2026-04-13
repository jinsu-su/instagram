from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.contact import Contact
from app.models.campaign import Campaign
from app.models.broadcast_log import BroadcastLog
from app.services.campaign_processor import CampaignProcessor
import logging

logger = logging.getLogger(__name__)

class BroadcastService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.campaign_processor = CampaignProcessor(db)
    
    async def preview_audience(
        self,
        customer_id: UUID,
        segment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Preview target audience based on segment criteria
        Returns: {total_contacts: int, contacts: List[Contact]}
        """
        contacts = await self._get_target_contacts(customer_id, segment)
        
        return {
            "total_contacts": len(contacts),
            "contacts": [
                {
                    "id": str(c.id),
                    "instagram_id": c.instagram_id,
                    "instagram_username": c.instagram_username,
                    "tags": c.tags or [],
                    "engagement_score": c.engagement_score or 0
                }
                for c in contacts[:50]  # Limit preview to 50
            ]
        }
    
    async def send_broadcast(
        self,
        campaign_id: UUID,
        send_now: bool = True,
        scheduled_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Send or schedule a broadcast campaign
        """
        # Get campaign
        result = await self.db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            raise ValueError("Campaign not found")
        
        if campaign.type != "BROADCAST":
            raise ValueError("Campaign must be of type BROADCAST")
        
        # Get target contacts
        contacts = await self._get_target_contacts(
            campaign.customer_id,
            campaign.target_segment or {}
        )
        
        if send_now:
            # Send immediately
            await self._execute_broadcast(campaign, contacts)
            campaign.sent_at = datetime.utcnow()
        else:
            # Schedule for later
            campaign.scheduled_at = scheduled_at
        
        # Update campaign stats
        if not campaign.stats:
            campaign.stats = {}
        campaign.stats["total_targeted"] = len(contacts)
        
        await self.db.commit()
        
        return {
            "status": "sent" if send_now else "scheduled",
            "total_targeted": len(contacts),
            "sent_at": campaign.sent_at.isoformat() if campaign.sent_at else None,
            "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None
        }
    
    async def _get_target_contacts(
        self,
        customer_id: UUID,
        segment: Dict[str, Any]
    ) -> List[Contact]:
        """
        Filter contacts based on segment criteria
        """
        query = select(Contact).where(Contact.customer_id == customer_id)
        
        # Filter by tags
        if segment.get("tags"):
            # PostgreSQL array contains operator
            for tag in segment["tags"]:
                query = query.where(Contact.tags.contains([tag]))
        
        # Filter by last activity
        if segment.get("last_active_days"):
            cutoff = datetime.utcnow() - timedelta(days=segment["last_active_days"])
            query = query.where(Contact.last_message_at >= cutoff)
        
        # Filter by engagement score
        if segment.get("min_engagement_score"):
            query = query.where(
                Contact.engagement_score >= segment["min_engagement_score"]
            )
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def _execute_broadcast(
        self,
        campaign: Campaign,
        contacts: List[Contact]
    ):
        """
        Execute broadcast sending to all contacts
        """
        message = campaign.config.get("message", "")
        buttons = campaign.config.get("buttons", [])
        image_url = campaign.config.get("image_url")
        
        # Get Instagram account for sending
        from app.models.instagram_account import InstagramAccount
        result = await self.db.execute(
            select(InstagramAccount).where(
                InstagramAccount.customer_id == campaign.customer_id
            ).limit(1)
        )
        instagram_account = result.scalar_one_or_none()
        
        if not instagram_account:
            logger.error(f"No Instagram account found for customer {campaign.customer_id}")
            return
        
        sent_count = 0
        delivered_count = 0
        
        for contact in contacts:
            try:
                # Send DM
                await self.campaign_processor.send_dm_with_buttons(
                    instagram_account,
                    contact.instagram_id,
                    message,
                    buttons,
                    image_url
                )
                
                # Log success
                log = BroadcastLog(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    sent_at=datetime.utcnow(),
                    delivered=True
                )
                self.db.add(log)
                sent_count += 1
                delivered_count += 1
                
            except Exception as e:
                logger.error(f"Failed to send broadcast to {contact.instagram_id}: {e}")
                # Log failure
                log = BroadcastLog(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    sent_at=datetime.utcnow(),
                    delivered=False,
                    error_message=str(e)
                )
                self.db.add(log)
                sent_count += 1
        
        # Update campaign stats
        campaign.stats["sent"] = sent_count
        campaign.stats["delivered"] = delivered_count
        
        await self.db.commit()
        logger.info(f"Broadcast sent: {delivered_count}/{sent_count} delivered")
    
    async def get_broadcast_stats(self, campaign_id: UUID) -> Dict[str, Any]:
        """
        Get broadcast performance statistics
        """
        # Get campaign
        result = await self.db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            raise ValueError("Campaign not found")
        
        # Get broadcast logs
        result = await self.db.execute(
            select(BroadcastLog).where(BroadcastLog.campaign_id == campaign_id)
        )
        logs = list(result.scalars().all())
        
        total_sent = len(logs)
        delivered = sum(1 for log in logs if log.delivered)
        opened = sum(1 for log in logs if log.opened)
        clicked = sum(1 for log in logs if log.clicked)
        replied = sum(1 for log in logs if log.replied)
        
        return {
            "total_targeted": campaign.stats.get("total_targeted", 0),
            "sent": total_sent,
            "delivered": delivered,
            "opened": opened,
            "clicked": clicked,
            "replied": replied,
            "open_rate": round((opened / delivered * 100) if delivered > 0 else 0, 1),
            "click_rate": round((clicked / delivered * 100) if delivered > 0 else 0, 1),
            "reply_rate": round((replied / delivered * 100) if delivered > 0 else 0, 1)
        }
