from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.models.campaign import Campaign
from app.schemas.campaign import CampaignUpdate, CampaignCreate

DEFAULT_CAMPAIGNS = [
    {
        "type": "WELCOME",
        "config": {
            "message": "안녕하세요! 문의해주셔서 감사합니다. 무엇을 도와드릴까요?",
            "buttons": ["위치 보기", "가격 문의"]
        }
    },
    {
        "type": "STORY_MENTION",
        "config": {
            "message": "스토리 언급 감사합니다! ❤️ 재방문 시 사용하실 수 있는 5% 할인 쿠폰을 드려요.",
            "coupon_code": "THANKYOU5"
        }
    },
    {
        "type": "COMMENT_GROWTH",
        "config": {
            "keyword_trigger": "정보",
            "message": "안녕하세요! 요청하신 상세 정보 링크입니다. 😊 확인해 보시고 궁금한 점은 언제든 말씀해 주세요!\n🔗 링크: [미리보기_링크_입력]",
            "auto_reply_comment": "디엠(DM)으로 정보를 보내드렸습니다! 확인 부탁드려요. ✨"
        }
    }
]

class CampaignService:
    async def get_campaigns(self, db: AsyncSession, customer_id: UUID) -> List[Campaign]:
        """
        Get all campaigns for a customer.
        Ensures default campaigns exist before returning.
        """
        await self.ensure_default_campaigns(db, customer_id)
        
        result = await db.execute(select(Campaign).where(Campaign.customer_id == customer_id))
        return result.scalars().all()

    async def get_campaign(self, db: AsyncSession, campaign_id: UUID) -> Optional[Campaign]:
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        return result.scalar_one_or_none()

    async def update_campaign(self, db: AsyncSession, campaign_id: UUID, payload: CampaignUpdate) -> Optional[Campaign]:
        campaign = await self.get_campaign(db, campaign_id)
        if not campaign:
            return None
        
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(campaign, key, value)
        
        await db.commit()
        await db.refresh(campaign)
        return campaign

    async def create_campaign(self, db: AsyncSession, customer_id: UUID, payload: CampaignCreate) -> Campaign:
        campaign = Campaign(
            customer_id=customer_id,
            type=payload.type,
            config=payload.config,
            is_active=payload.is_active,
            template_id=payload.template_id,
            stats={}
        )
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        return campaign

    async def ensure_default_campaigns(self, db: AsyncSession, customer_id: UUID):
        """
        Create default campaigns for the customer if they don't exist.
        """
        result = await db.execute(select(Campaign.type).where(Campaign.customer_id == customer_id))
        existing_types = set(result.scalars().all())
        
        new_campaigns = []
        for default in DEFAULT_CAMPAIGNS:
            if default["type"] not in existing_types:
                new_campaign = Campaign(
                    customer_id=customer_id,
                    type=default["type"],
                    config=default["config"],
                    is_active=False
                )
                db.add(new_campaign)
                new_campaigns.append(new_campaign)
        
        if new_campaigns:
            await db.commit()
