from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
import httpx

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, DBAPIError

from app.models.customer import Customer
from app.models.oauth_account import OAuthAccount, OAuthProvider
from app.models import Contact, Campaign, InstagramAccount, AutomationActivity
from app.models.chat import ChatSession, ChatMessage
from app.models.ai_insight import AiInsight
from app.models.ai_performance_report import AIPerformanceReport
from app.models.broadcast_log import BroadcastLog
from app.schemas.customer import CustomerCreateRequest, CustomerUpdateRequest, CustomerResponse
from app.schemas.admin import CustomerListResponse
from app.schemas.instagram import InstagramAccountResponse
from app.schemas.instagram import InstagramAccountResponse
from app.utils.logging import get_logger
from app.config import get_settings
from app.models.base import Base

logger = get_logger(__name__)

DEFAULT_INTEGRATION_STATUS = "PENDING"
ALLOWED_INTEGRATION_STATUSES = {"PENDING", "APPROVED"}


class CustomerUpsertResult:
    def __init__(self, id: str, is_new: bool, transfer_required: bool = False):
        self.id = id
        self.is_new = is_new
        self.transfer_required = transfer_required


class CustomerService:
    async def list_customers(
        self, db: AsyncSession, page: int = 1, page_size: int = 20
    ) -> CustomerListResponse:
        offset = (page - 1) * page_size
        
        count_result = await db.execute(select(func.count(Customer.id)))
        total = count_result.scalar() or 0
        
        result = await db.execute(
            select(Customer)
            .offset(offset)
            .limit(page_size)
            .order_by(Customer.created_at.desc())
        )
        customers = result.scalars().all()

        instagram_map = {}
        if customers:
            customer_ids = [customer.id for customer in customers]
            instagram_result = await db.execute(
                select(InstagramAccount).where(InstagramAccount.customer_id.in_(customer_ids))
            )
            instagram_accounts = instagram_result.scalars().all()
            instagram_map = {account.customer_id: account for account in instagram_accounts}
        
        results = []
        for customer in customers:
            response = CustomerResponse.model_validate(customer)
            instagram_account = instagram_map.get(customer.id)
            if instagram_account:
                response = response.model_copy(
                    update={
                        "instagram_account": InstagramAccountResponse.model_validate(instagram_account)
                    }
                )
            results.append(response)

        return CustomerListResponse(
            page=page,
            page_size=page_size,
            total=total,
            results=results,
        )

    async def get_customer(self, db: AsyncSession, customer_id: UUID) -> Optional[CustomerResponse]:
        customer = await db.get(Customer, customer_id)
        if not customer:
            return None
            
        # Ensure we have the latest data from the DB
        await db.refresh(customer)
        
        # Load related Instagram account
        instagram_result = await db.execute(
            select(InstagramAccount).where(InstagramAccount.customer_id == customer_id)
        )
        instagram_account = instagram_result.scalars().first()
        
        # Load OAuth account to get profile picture
        oauth_result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.customer_id == customer_id,
                OAuthAccount.provider == OAuthProvider.META
            )
        )
        oauth_account = oauth_result.scalars().first()
        
        instagram_account_response = None
        if instagram_account and instagram_account.access_token:
            instagram_account_response = InstagramAccountResponse.model_validate(instagram_account)
        
        # Get profile picture URL from OAuth account (stored in notes or access token info)
        profile_picture = None
        if oauth_account and oauth_account.access_token:
            # Try to get profile picture from Facebook API using access token
            try:
                async with httpx.AsyncClient() as client:
                    # Request maximum size profile picture - try multiple sizes
                    # Facebook Graph API supports different sizes, try largest first
                    sizes_to_try = [
                        ("picture.width(1000).height(1000)", "1000x1000"),
                        ("picture.width(720).height(720)", "720x720"),
                        ("picture.width(500).height(500)", "500x500"),
                        ("picture.type(large)", "large"),
                    ]
                    
                    # Instagram Business Login: Always use graph.instagram.com fields
                    # (id, username, profile_picture_url)
                    try:
                        response = await client.get(
                            f"https://graph.instagram.com/v25.0/me",
                            params={
                                "access_token": oauth_account.access_token,
                                "fields": "id,username,profile_picture_url",
                            },
                            timeout=5.0,
                        )
                        if response.status_code == 200:
                            data = response.json()
                            profile_picture = data.get("profile_picture_url")
                            if profile_picture:
                                logger.info(f"Successfully got Instagram profile picture: {profile_picture[:100]}...")
                    except Exception as e:
                        logger.warning(f"Failed to get Instagram profile info: {str(e)}")
            except Exception as e:
                logger.warning(f"Failed to get profile picture: {str(e)}")
                pass  # If failed to get picture, continue without it
        
        return CustomerResponse(
            id=customer.id,
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            industry=customer.industry,
            business_type=customer.business_type,
            partner_code=customer.partner_code,
            signup_source=customer.signup_source,
            marketing_opt_in=customer.marketing_opt_in,
            terms_agreed_at=customer.terms_agreed_at,
            notes=customer.notes,
            created_at=customer.created_at,
            updated_at=customer.updated_at,
            instagram_account=instagram_account_response,
            profile_picture=profile_picture,
            integration_status=customer.integration_status or DEFAULT_INTEGRATION_STATUS,
        )

    async def create_customer(
        self, db: AsyncSession, payload: CustomerCreateRequest
    ) -> CustomerResponse:
        customer = Customer(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            industry=payload.industry,
            business_type=payload.business_type,
            partner_code=payload.partner_code,
            signup_source="MANUAL",
            marketing_opt_in=payload.marketing_opt_in,
            terms_agreed_at=datetime.now(timezone.utc).replace(tzinfo=None),
            integration_status=DEFAULT_INTEGRATION_STATUS,
        )
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        
        # get_customer와 동일한 방식으로 응답 생성 (새로 생성된 customer이므로 instagram_account와 profile_picture는 None)
        return CustomerResponse(
            id=customer.id,
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            industry=customer.industry,
            business_type=customer.business_type,
            partner_code=customer.partner_code,
            signup_source=customer.signup_source,
            marketing_opt_in=customer.marketing_opt_in,
            terms_agreed_at=customer.terms_agreed_at,
            notes=customer.notes,
            created_at=customer.created_at,
            updated_at=customer.updated_at,
            instagram_account=None,  # 새로 생성된 customer이므로 아직 없음
            profile_picture=None,  # 새로 생성된 customer이므로 아직 없음
            integration_status=customer.integration_status or DEFAULT_INTEGRATION_STATUS,
        )

    async def update_customer(
        self, db: AsyncSession, customer_id: UUID, payload: CustomerUpdateRequest
    ) -> Optional[CustomerResponse]:
        customer = await db.get(Customer, customer_id)
        if not customer:
            return None
        
        if payload.name is not None:
            customer.name = payload.name
        if payload.email is not None:
            # 이메일 변경 시 중복 확인
            if payload.email != customer.email:
                existing = await db.scalar(
                    select(Customer).where(Customer.email == payload.email)
                )
                if existing and existing.id != customer_id:
                    raise ValueError(f"Email {payload.email} is already registered")
            customer.email = payload.email
        if payload.phone is not None:
            customer.phone = payload.phone
        if payload.industry is not None:
            customer.industry = payload.industry
        if payload.business_type is not None:
            customer.business_type = payload.business_type
        if payload.partner_code is not None:
            customer.partner_code = payload.partner_code
        if payload.marketing_opt_in is not None:
            customer.marketing_opt_in = payload.marketing_opt_in
        if payload.integration_status is not None:
            if payload.integration_status not in ALLOWED_INTEGRATION_STATUSES:
                raise ValueError(f"Invalid integration status: {payload.integration_status}")
            customer.integration_status = payload.integration_status
        
        customer.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(customer)
        
        # get_customer와 동일한 방식으로 응답 생성
        return await self.get_customer(db, customer_id)

    async def upsert_meta_account(
        self,
        db: AsyncSession,
        meta_user,
        long_lived_token: str,
        customer_id: str = None,
    ) -> CustomerUpsertResult:
        """Create or update customer and OAuth account from Meta OAuth."""
        pseudo_email = meta_user.email or f"{meta_user.facebook_user_id}@facebook.com"
        
        # Search for existing customer
        customer = None
        is_new = True
        
        # 1. If customer_id is provided, THAT IS the target customer (Linking Flow)
        # For linking, we must honor the current session's customer ID.
        if customer_id:
            customer = await db.get(Customer, UUID(customer_id))
            if customer:
                is_new = False
                logger.info(f"Using explicitly provided customer_id from state: {customer.id}")
        
        # 2. If not found or not provided, try to find by OAuthAccount (Existing login session)
        if customer is None:
            oauth_result = await db.execute(
                select(OAuthAccount).where(
                    OAuthAccount.provider == OAuthProvider.META,
                    OAuthAccount.subject == meta_user.facebook_user_id,
                )
            )
            oauth_account = oauth_result.scalars().first()
            
            if oauth_account:
                customer = await db.get(Customer, oauth_account.customer_id)
                if customer:
                    is_new = False
                    logger.info(f"Found existing customer by OAuthAccount: customer_id={customer.id}")
        else:
            # Still need to fetch oauth_account record if it exists to potentially re-link it later
            oauth_result = await db.execute(
                select(OAuthAccount).where(
                    OAuthAccount.provider == OAuthProvider.META,
                    OAuthAccount.subject == meta_user.facebook_user_id,
                )
            )
            oauth_account = oauth_result.scalars().first()
        
        # 3. If still not found, try by email
        if customer is None:
            email_result = await db.execute(
                select(Customer).where(Customer.email == pseudo_email)
            )
            customer = email_result.scalars().first()
            if customer:
                is_new = False
                logger.info(f"Found existing customer by email: customer_id={customer.id}")
        
        # Create new customer if not found
        if customer is None:
            try:
                terms_agreed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                
                customer = Customer(
                    name=meta_user.name or pseudo_email,
                    email=pseudo_email,
                    signup_source="META",
                    marketing_opt_in=False,
                    terms_agreed_at=terms_agreed_at,
                    created_at=now,
                    updated_at=now,
                    integration_status=DEFAULT_INTEGRATION_STATUS,
                )
                db.add(customer)
                await db.flush()
                await db.refresh(customer)
                is_new = True
                logger.info(f"Created new customer: customer_id={customer.id}, email={customer.email}")
            except (IntegrityError, DBAPIError) as e:
                error_str = str(e).lower()
                if "unique" in error_str or "duplicate" in error_str:
                    logger.warning(f"Unique constraint violation, searching for existing customer: {str(e)}")
                    await db.rollback()
                    
                    # Retry search
                    for attempt in range(5):
                        if attempt > 0:
                            await asyncio.sleep(0.1 * attempt)
                        
                        email_result = await db.execute(
                            select(Customer).where(Customer.email == pseudo_email)
                        )
                        customer = email_result.scalars().first()
                        if customer:
                            is_new = False
                            break
                        
                        oauth_result = await db.execute(
                            select(OAuthAccount).where(
                                OAuthAccount.provider == OAuthProvider.META,
                                OAuthAccount.subject == meta_user.facebook_user_id,
                            )
                        )
                        oauth_account = oauth_result.scalars().first()
                        if oauth_account:
                            customer = await db.get(Customer, oauth_account.customer_id)
                            if customer:
                                is_new = False
                                break
                    
                    if customer is None:
                        raise
                else:
                    raise
        
        # Update or create OAuthAccount
        transfer_required = False
        if oauth_account is None:
            oauth_account = OAuthAccount(
                customer_id=customer.id,
                provider=OAuthProvider.META,
                subject=meta_user.facebook_user_id,
                access_token=long_lived_token,
            )
            db.add(oauth_account)
        else:
            # Check if this Meta account belongs to someone else
            if oauth_account.customer_id != customer.id:
                logger.warning(f"Attempting to move OAuthAccount from customer {oauth_account.customer_id} to {customer.id}")
                # For now, we allow the Meta login to move, as it identifies the person.
                # But we mark that a transfer happened.
                oauth_account.customer_id = customer.id
                transfer_required = True
                
            oauth_account.access_token = long_lived_token
            oauth_account.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Mark customer as APPROVED upon successful Meta OAuth
        if customer.integration_status != "APPROVED":
            customer.integration_status = "APPROVED"
            logger.info(f"Customer {customer.id} integration_status marked as APPROVED")
            
        # Update name and notes if available
        if meta_user.name and (not customer.name or customer.signup_source == "META"):
            customer.name = meta_user.name
            
        customer.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        await db.commit()
        await db.refresh(customer)
        
        return CustomerUpsertResult(id=str(customer.id), is_new=is_new, transfer_required=transfer_required)

    async def upsert_google_account(
        self,
        db: AsyncSession,
        google_user_id: str,
        name: str | None,
        email: str | None,
        access_token: str,
        refresh_token: str | None = None,
    ) -> CustomerUpsertResult:
        """Create or update customer and OAuth account from Google OAuth."""
        if not email:
            raise ValueError("Google OAuth requires email address")
        
        # Search for existing customer
        customer = None
        is_new = True
        
        # Try to find by OAuthAccount first
        oauth_result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == OAuthProvider.GOOGLE,
                OAuthAccount.subject == google_user_id,
            )
        )
        oauth_account = oauth_result.scalars().first()
        
        if oauth_account:
            customer = await db.get(Customer, oauth_account.customer_id)
            if customer:
                is_new = False
                logger.info(f"Found existing customer by Google OAuthAccount: customer_id={customer.id}")
        
        # If not found, try by email
        if customer is None:
            email_result = await db.execute(
                select(Customer).where(Customer.email == email)
            )
            customer = email_result.scalars().first()
            if customer:
                is_new = False
                logger.info(f"Found existing customer by email: customer_id={customer.id}")
        
        # Create new customer if not found
        if customer is None:
            try:
                terms_agreed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                
                customer = Customer(
                    name=name or email.split("@")[0],
                    email=email,
                    signup_source="GOOGLE",
                    marketing_opt_in=False,
                    terms_agreed_at=terms_agreed_at,
                    created_at=now,
                    updated_at=now,
                )
                db.add(customer)
                await db.flush()
                await db.refresh(customer)
                is_new = True
                logger.info(f"Created new customer from Google: customer_id={customer.id}, email={customer.email}")
            except (IntegrityError, DBAPIError) as e:
                error_str = str(e).lower()
                if "unique" in error_str or "duplicate" in error_str:
                    logger.warning(f"Unique constraint violation, searching for existing customer: {str(e)}")
                    await db.rollback()
                    
                    # Retry search
                    for attempt in range(5):
                        if attempt > 0:
                            await asyncio.sleep(0.1 * attempt)
                        
                        email_result = await db.execute(
                            select(Customer).where(Customer.email == email)
                        )
                        customer = email_result.scalars().first()
                        if customer:
                            is_new = False
                            break
                        
                        oauth_result = await db.execute(
                            select(OAuthAccount).where(
                                OAuthAccount.provider == OAuthProvider.GOOGLE,
                                OAuthAccount.subject == google_user_id,
                            )
                        )
                        oauth_account = oauth_result.scalars().first()
                        if oauth_account:
                            customer = await db.get(Customer, oauth_account.customer_id)
                            if customer:
                                is_new = False
                                break
                    
                    if customer is None:
                        raise
                else:
                    raise
        
        # Update or create OAuthAccount
        if oauth_account is None:
            oauth_account = OAuthAccount(
                customer_id=customer.id,
                provider=OAuthProvider.GOOGLE,
                subject=google_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
            )
            db.add(oauth_account)
        else:
            oauth_account.access_token = access_token
            if refresh_token:
                oauth_account.refresh_token = refresh_token
            oauth_account.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        await db.commit()
        
        return CustomerUpsertResult(id=str(customer.id), is_new=is_new)

    async def get_meta_oauth_account(self, db: AsyncSession, customer_id: UUID) -> Optional[OAuthAccount]:
        result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.customer_id == customer_id,
                OAuthAccount.provider == OAuthProvider.META,
            )
        )
        account = result.scalars().first()
        return account

    async def get_instagram_account(self, db: AsyncSession, customer_id: UUID) -> Optional[InstagramAccount]:
        """
        고객의 최신 Instagram 계정 정보를 반환합니다.
        보안 주의: 반환된 객체의 access_token은 암호화된 상태 그대로입니다.
        사용 시 반드시 decrypt_token()을 호출하세요.
        """
        result = await db.execute(
            select(InstagramAccount)
            .where(InstagramAccount.customer_id == customer_id)
            .order_by(InstagramAccount.updated_at.desc())
            .limit(1)
        )
        return result.scalars().first()
    
    async def get_instagram_accounts(self, db: AsyncSession, customer_id: UUID) -> List[InstagramAccount]:
        """
        고객의 모든 Instagram 계정을 반환합니다 (여러 계정 지원).
        """
        result = await db.execute(
            select(InstagramAccount).where(InstagramAccount.customer_id == customer_id)
        )
        accounts = list(result.scalars().all())
        return accounts
    
    async def update_ai_response_settings(
        self, 
        db: AsyncSession, 
        customer_id: UUID, 
        system_prompt: str,
        is_ai_active: bool = True,
        ai_operate_start: str = "00:00",
        ai_operate_end: str = "23:59",
        ai_timezone: str = "Asia/Seoul",
        ai_knowledge_base_url: str = None,
        ai_knowledge_base_filename: str = None,
        is_moderation_alert_active: bool = True
    ) -> bool:
        """
        고객의 AI 응답 프롬프트를 업데이트합니다 (Customer 테이블에 저장).
        """
        customer = await db.get(Customer, customer_id)
        if not customer:
            return False
        
        customer.system_prompt = system_prompt
        customer.is_ai_active = is_ai_active
        customer.ai_operate_start = ai_operate_start
        customer.ai_operate_end = ai_operate_end
        customer.timezone = ai_timezone
        customer.ai_knowledge_base_url = ai_knowledge_base_url
        customer.ai_knowledge_base_filename = ai_knowledge_base_filename
        customer.is_moderation_alert_active = is_moderation_alert_active
        customer.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        await db.commit()
        return True

    async def update_moderation_settings(
        self, 
        db: AsyncSession, 
        customer_id: UUID, 
        is_moderation_alert_active: bool = True
    ) -> bool:
        """
        고객의 실시간 악플 탐지 알림 설정을 업데이트합니다 (Customer 테이블에 저장).
        """
        customer = await db.get(Customer, customer_id)
        if not customer:
            return False
            
        customer.is_moderation_alert_active = is_moderation_alert_active
        customer.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        await db.commit()
        return True

    async def update_post_moderation_setting(
        self, 
        db: AsyncSession, 
        customer_id: UUID, 
        post_id: str,
        is_disabled: bool
    ) -> bool:
        """
        특정 게시물의 실시간 악플 탐지 알림 설정을 업데이트합니다 (InstagramAccount 테이블에 저장).
        """
        from app.models.instagram_account import InstagramAccount
        from sqlalchemy import select
        
        # InstagramAccount 조회
        result = await db.execute(
            select(InstagramAccount).where(InstagramAccount.customer_id == customer_id)
        )
        account = result.scalars().first()
        if not account:
            return False
            
        # 기존 리스트 가져오기 (없으면 빈 리스트)
        disabled_posts = list(account.moderation_disabled_posts or [])
        
        if is_disabled:
            # 비활성화 목록에 추가 (중복 방지)
            if post_id not in disabled_posts:
                disabled_posts.append(post_id)
        else:
            # 비활성화 목록에서 제거
            if post_id in disabled_posts:
                disabled_posts.remove(post_id)
                
        # 업데이트 및 저장
        account.moderation_disabled_posts = disabled_posts
        account.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(account, "moderation_disabled_posts")
        
        await db.commit()
        return True

    async def update_keyword_settings(
        self, db: AsyncSession, customer_id: UUID, keyword_replies: list
    ) -> bool:
        """
        고객의 키워드 답장 설정을 업데이트합니다 (Customer 테이블에 저장).
        """
        customer = await db.get(Customer, customer_id)
        if not customer:
            return False
        
        customer.keyword_replies = keyword_replies
        customer.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(customer, "keyword_replies")
        
        await db.commit()
        return True

    async def get_dashboard_stats(self, db: AsyncSession, customer_id: UUID) -> dict:
        """
        대시보드 통계 데이터 (총 고객 수, 활성 캠페인 수 등)를 반환합니다.
        """
        stats = {
            "total_contacts": 0,
            "active_automations": 0,
            "total_broadcasts_sent": 0,
            "total_ai_replies": 0,
            "total_flow_triggers": 0
        }
        
        try:
            # 1. Total Contacts
            try:
                contact_count_query = select(func.count(Contact.id)).where(Contact.customer_id == customer_id)
                stats["total_contacts"] = (await db.execute(contact_count_query)).scalar() or 0
            except Exception as e:
                logger.error(f"Error fetching total_contacts: {e}")
            
            # 2. Active Automations (Broadcast 제외)
            try:
                campaign_count_query = select(func.count(Campaign.id)).where(
                    Campaign.customer_id == customer_id,
                    Campaign.is_active == True,
                    Campaign.type != 'BROADCAST'
                )
                stats["active_automations"] = (await db.execute(campaign_count_query)).scalar() or 0
            except Exception as e:
                logger.error(f"Error fetching active_automations: {e}")
            
            # 3. Total Broadcasts Sent
            try:
                broadcast_count_query = select(func.count(Campaign.id)).where(
                    Campaign.customer_id == customer_id,
                    Campaign.type == 'BROADCAST',
                    Campaign.sent_at.isnot(None)
                )
                stats["total_broadcasts_sent"] = (await db.execute(broadcast_count_query)).scalar() or 0
            except Exception as e:
                logger.error(f"Error fetching total_broadcasts_sent: {e}")
            
            # 4. Total AI Replies
            try:
                stats["total_ai_replies"] = (await db.execute(select(func.count(AutomationActivity.id)).where(AutomationActivity.customer_id == customer_id, AutomationActivity.event_type == 'AI_CHAT_REPLY'))).scalar() or 0
            except Exception as e:
                logger.error(f"Error fetching total_ai_replies: {e}")

            # 5. Total Flow Triggers
            try:
                stats["total_flow_triggers"] = (await db.execute(select(func.count(AutomationActivity.id)).where(AutomationActivity.customer_id == customer_id, AutomationActivity.event_type == 'FLOW_TRIGGER'))).scalar() or 0
            except Exception as e:
                logger.error(f"Error fetching total_flow_triggers: {e}")

        except Exception as e:
            logger.error(f"Error in get_dashboard_stats wrapper: {e}")
            
        return stats

    async def get_automation_statistics(self, db: AsyncSession, customer_id: UUID, days: int = 30) -> dict:
        """
        AI 자동화 통계 데이터를 반환합니다 (절약된 시간, 이벤트 타입 분포, 의도 분포).
        """
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import select, func, desc
        from app.models.automation_activity import AutomationActivity
        
        cutoff_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
        
        stats = {
            "total_activities": 0,
            "time_saved_minutes": 0,
            "event_distribution": [],
            "intent_distribution": []
        }
        
        try:
            # 1. Total count
            total_count = (await db.execute(select(func.count(AutomationActivity.id)).where(
                AutomationActivity.customer_id == customer_id,
                AutomationActivity.status == "SUCCESS",
                AutomationActivity.created_at >= cutoff_date
            ))).scalar() or 0
            
            stats["total_activities"] = total_count
            stats["time_saved_minutes"] = total_count * 1.5  # 1.5 minutes per response
            
            # 2. Event Type Distribution
            event_query = select(
                AutomationActivity.event_type, 
                func.count(AutomationActivity.id).label('count')
            ).where(
                AutomationActivity.customer_id == customer_id,
                AutomationActivity.status == "SUCCESS",
                AutomationActivity.created_at >= cutoff_date,
                AutomationActivity.event_type.isnot(None)
            ).group_by(AutomationActivity.event_type).order_by(desc('count'))
            
            event_results = await db.execute(event_query)
            for row in event_results.all():
                stats["event_distribution"].append({
                    "type": row.event_type,
                    "count": row.count
                })
                
            # 3. Intent Distribution (Top 5)
            intent_query = select(
                AutomationActivity.intent, 
                func.count(AutomationActivity.id).label('count')
            ).where(
                AutomationActivity.customer_id == customer_id,
                AutomationActivity.status == "SUCCESS",
                AutomationActivity.created_at >= cutoff_date,
                AutomationActivity.intent.isnot(None),
                AutomationActivity.intent != ""
            ).group_by(AutomationActivity.intent).order_by(desc('count')).limit(5)
            
            intent_results = await db.execute(intent_query)
            for row in intent_results.all():
                # Avoid empty intent strings or nulls (though filtered in where clause)
                if row.intent.strip():
                    stats["intent_distribution"].append({
                        "intent": row.intent,
                        "count": row.count
                    })
                
        except Exception as e:
            logger.error(f"Error fetching automation statistics: {e}")
            
        return stats

    async def get_recent_conversations_for_ai(self, db: AsyncSession, customer_id: UUID, limit: int = 15) -> List[Dict[str, Any]]:
        """
        AI 분석을 위해 대화의 상세 문맥(메시지, 참여자 등)을 수집합니다.
        단순 텍스트 리스트가 아닌 구조화된 데이터를 반환합니다.
        
        캐시 전략:
        - 최근 5분 이내에 호출했으면 캐시된 결과 반환 (Graph API 호출 생략)
        - 캐시가 없거나 만료되었으면 Graph API 호출 후 캐시 저장
        """
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import select
        from app.models.ai_insight import AiInsight
        
        # 1. 캐시 체크: 최근 5분 이내에 저장된 대화 데이터가 있는지 확인
        # (AiInsight의 data_hash를 활용하되, 실제로는 별도 캐시 테이블이 더 좋지만
        #  지금은 간단하게 최근 분석 결과가 있으면 대화 데이터도 최신일 가능성이 높음)
        # 
        # 더 정확한 방법: 대화 데이터를 별도로 캐싱하거나, 
        # 최소한 Graph API 호출 전에 "최근 업데이트 시간"을 체크해서
        # 변경이 없으면 캐시 사용
        
        account = await self.get_instagram_account(db, customer_id)
        if not account:
            return []
        if not account.page_id or not account.access_token:
            return []
        
        # 간단한 인메모리 캐시 (프로세스 단위, 서버 재시작 시 초기화)
        # 키: customer_id, 값: (conversations, timestamp)
        cache_key = f"conversations_ai:{customer_id}"
        cache_ttl_seconds = 300  # 5분
        
        # 전역 캐시 딕셔너리 (모듈 레벨)
        if not hasattr(self, '_conversation_cache'):
            self._conversation_cache = {}
        
        now = time.monotonic()
        if cache_key in self._conversation_cache:
            cached_data, cached_time = self._conversation_cache[cache_key]
            if (now - cached_time) < cache_ttl_seconds:
                logger.info(f"⚡ Cache Hit: Using cached conversations for AI analysis (customer {customer_id})")
                return cached_data
        
        # 캐시 미스: Graph API 호출
        logger.info(f"📡 Fetching conversations from Graph API for AI analysis (customer {customer_id})")
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Graph API v25.0
                # messages.limit(3): 최근 3개 메시지를 가져와 context 파악
                if account.access_token.startswith("IG"):
                     url = f"https://graph.instagram.com/v25.0/me/conversations"
                     logger.info(f"Using graph.instagram.com for AI context (IG Token)")
                else:
                     url = f"https://graph.instagram.com/v25.0/{account.page_id}/conversations"
                     
                params = {
                    "platform": "instagram",
                    "access_token": account.access_token,
                    "fields": "id,updated_time,participants,messages.limit(3){message,from,created_time}", 
                    "limit": limit
                }
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Graph API Error: {response.text}")
                    return []
                    
                data = response.json()
                conversations = []
                
                if "data" in data:
                    # Calculate cutoff for 3 days
                    from datetime import datetime, timedelta
                    cutoff_time = datetime.now() - timedelta(days=3)
                    
                    for conv in data["data"]:
                        # Extract relevant info
                        thread_id = conv.get("id")
                        updated_time_str = conv.get("updated_time")
                        
                        # Filter by date (last 3 days only)
                        if updated_time_str:
                            try:
                                # ISO 8601 parsing (simple)
                                # Example: 2023-10-27T10:00:00+0000
                                # We'll just compare naively or parse properly
                                conv_time = datetime.strptime(updated_time_str, "%Y-%m-%dT%H:%M:%S%z")
                                # Convert cutoff to timezone aware if needed, or just compare UTC
                                if conv_time.replace(tzinfo=None) < cutoff_time:
                                    continue
                            except Exception:
                                pass # If date parsing fails, include it just in case

                        updated_time = updated_time_str
                        
                        participants_data = conv.get("participants", {}).get("data", [])
                        
                        # Identify which participant is the customer (not our own account)
                        # We'll use this as the representative username for the thread
                        customer_name = "Unknown"
                        our_ids = {account.instagram_user_id, account.page_id}
                        for p in participants_data:
                            p_id = p.get("id")
                            if p_id not in our_ids:
                                customer_name = p.get("username", p.get("name", "Unknown"))
                                break
                        
                        msgs_data = conv.get("messages", {}).get("data", [])
                        messages_content = []
                        
                        for m in msgs_data:
                            msg_text = m.get("message")
                            if msg_text:
                                sender_id = m.get("from", {}).get("id")
                                # Assign role: BIZ if it matches our IDs, else CUSTOMER
                                role = "BIZ" if sender_id in our_ids else "CUSTOMER"
                                
                                messages_content.append({
                                    "text": msg_text,
                                    "role": role,
                                    "sender_id": sender_id,
                                    "created_time": m.get("created_time")
                                })
                                
                        if messages_content:
                            conversations.append({
                                "thread_id": thread_id,
                                "username": customer_name,
                                "updated_time": updated_time,
                                "messages": messages_content
                            })
                
                # 캐시 저장
                self._conversation_cache[cache_key] = (conversations, time.monotonic())
                logger.info(f"✅ Cached conversations for AI analysis (customer {customer_id}, {len(conversations)} conversations)")
                            
                return conversations
            except Exception as e:
                logger.error(f"Error fetching conversation details: {e}")
                return []


    
    async def get_all_active_instagram_accounts(self, db: AsyncSession) -> List[InstagramAccount]:
        """
        모든 활성 Instagram 계정을 반환합니다 (웹훅 일괄 구독용).
        access_token이 있고 page_id가 있는 계정만 반환합니다.
        """
        result = await db.execute(
            select(InstagramAccount).where(
                InstagramAccount.access_token.isnot(None),
                InstagramAccount.page_id.isnot(None)
            )
        )
        return list(result.scalars().all())

    async def get_instagram_account_by_page_id_and_customer(
        self, db: AsyncSession, customer_id: UUID, page_id: str
    ) -> Optional[InstagramAccount]:
        """
        고객의 특정 page_id에 해당하는 Instagram 계정을 반환합니다.
        """
        result = await db.execute(
            select(InstagramAccount).where(
                InstagramAccount.customer_id == customer_id,
                InstagramAccount.page_id == page_id
            )
        )
        return result.scalars().first()

    async def get_instagram_account_by_instagram_user_id_and_customer(
        self, db: AsyncSession, customer_id: UUID, instagram_user_id: str
    ) -> Optional[InstagramAccount]:
        """
        고객의 특정 instagram_user_id에 해당하는 Instagram 계정을 반환합니다.
        """
        result = await db.execute(
            select(InstagramAccount).where(
                InstagramAccount.customer_id == customer_id,
                InstagramAccount.instagram_user_id == str(instagram_user_id)
            )
        )
        return result.scalars().first()

    async def get_instagram_account_by_page_id(
        self, db: AsyncSession, page_id: str
    ) -> Optional[InstagramAccount]:
        """
        page_id로 승인된 고객의 Instagram 계정 정보 조회 (웹훅용)
        """
        result = await db.execute(
            select(InstagramAccount)
            .join(Customer)
            .where(
                InstagramAccount.page_id == str(page_id),
                Customer.integration_status == "APPROVED",
            )
        )
        return result.scalars().first()

    async def get_instagram_account_by_instagram_user_id(
        self, db: AsyncSession, instagram_user_id: str
    ) -> Optional[InstagramAccount]:
        """
        instagram_user_id로 승인된 고객의 Instagram 계정 정보 조회 (웹훅용)
        """
        result = await db.execute(
            select(InstagramAccount)
            .join(Customer)
            .where(
                InstagramAccount.instagram_user_id == str(instagram_user_id),
                Customer.integration_status == "APPROVED",
            )
        )
        return result.scalars().first()

    async def get_instagram_account_by_username(
        self, db: AsyncSession, instagram_username: str
    ) -> Optional[InstagramAccount]:
        """
        instagram_username으로 승인된 고객의 Instagram 계정 정보 조회 (무한 루프 방지용)
        """
        if not instagram_username:
            return None
            
        result = await db.execute(
            select(InstagramAccount)
            .where(
                InstagramAccount.instagram_username == instagram_username
            )
        )
        return result.scalars().first()

    async def get_instagram_account_by_ig_id(
        self, db: AsyncSession, ig_id: str
    ) -> Optional[InstagramAccount]:
        """
        ig_id로 승인된 고객의 Instagram 계정 정보 조회 (무한 루프 방지용)
        """
        if not ig_id:
            return None
            
        result = await db.execute(
            select(InstagramAccount)
            .where(
                InstagramAccount.ig_id == str(ig_id)
            )
        )
        return result.scalars().first()

    async def save_instagram_account(
        self,
        db: AsyncSession,
        customer_id: UUID | str,
        *,
        page_id: str | None,
        instagram_user_id: str,
        access_token: str,
        token_expires_at: datetime | None = None,
        instagram_username: str | None = None,
        ig_id: str | None = None,
        profile_picture_url: str | None = None,
        followers_count: int | None = None,
        follows_count: int | None = None,
        media_count: int | None = None,
        force_transfer: bool = False,
        commit: bool = True,
    ) -> InstagramAccount:
        if isinstance(customer_id, str):
            customer_id = UUID(customer_id)
        
        # Force IDs to be strings to avoid DB type mismatch
        if instagram_user_id is not None:
            instagram_user_id = str(instagram_user_id)
        if page_id is not None:
            page_id = str(page_id)
            
        # If ig_id is missing but instagram_user_id looks like a numerical ID, use it.
        # This helps with webhook matching which relies on the numerical ID.
        # Business accounts usually have 15-17 digit IDs.
        if not ig_id and instagram_user_id and str(instagram_user_id).isdigit() and len(str(instagram_user_id)) >= 15:
            ig_id = str(instagram_user_id)
        
        from sqlalchemy import delete
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        if token_expires_at and token_expires_at.tzinfo is not None:
            token_expires_at = token_expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        
        # 1. Instagram ID로 기존 계정 검색 (소유자 무관)
        from app.models.instagram_account import InstagramAccount
        result = await db.execute(
            select(InstagramAccount).where(
                InstagramAccount.instagram_user_id == instagram_user_id
            )
        )
        existing_account_by_id = result.scalars().first()

        # 1-2. 현재 고객에게 이미 연결된 계정이 있는지 확인 (교체 감지를 위해)
        current_linked_result = await db.execute(
            select(InstagramAccount).where(InstagramAccount.customer_id == customer_id)
        )
        current_linked_account = current_linked_result.scalars().first()
        
        # CRITICAL: 교체 감지를 위해 기존 instagram_user_id를 미리 저장
        old_instagram_user_id = current_linked_account.instagram_user_id if current_linked_account else None
        
        # 계정 교체 감지: 기존 계정이 있고, ID가 다른 경우
        if old_instagram_user_id and old_instagram_user_id != instagram_user_id:
            logger.info(f"🔄 Instagram 계정 교체 감지 ({old_instagram_user_id} -> {instagram_user_id}). 모든 기존 상호작용 데이터를 삭제합니다.")
            await db.execute(delete(Contact).where(Contact.customer_id == customer_id))
            await db.execute(delete(AutomationActivity).where(AutomationActivity.customer_id == customer_id))
            await db.execute(delete(ChatSession).where(ChatSession.customer_id == customer_id))
            await db.execute(delete(AiInsight).where(AiInsight.customer_id == customer_id))
            await db.execute(delete(AIPerformanceReport).where(AIPerformanceReport.customer_id == customer_id))
            
            # BroadcastLog 삭제 (Contact 조인 필수)
            await db.execute(delete(BroadcastLog).where(
                BroadcastLog.contact_id.in_(
                    select(Contact.id).where(Contact.customer_id == customer_id)
                )
            ))

        # 1-3. [Production Robustness] Ensure global uniqueness of instagram_user_id
        # Delete any other records with the same instagram_user_id that belong to OTHER customers
        # if this is a force_transfer or if we want to ensure pure 1:1 mapping.
        if instagram_user_id:
            logger.info(f"🧹 Ensuring global uniqueness for IG ID: {instagram_user_id}")
            cleanup_stmt = delete(InstagramAccount).where(
                InstagramAccount.instagram_user_id == instagram_user_id,
                InstagramAccount.customer_id != customer_id
            )
            await db.execute(cleanup_stmt)

        if existing_account_by_id:
            # 2. 계정이 존재하면 업데이트 (소유권 이전 포함)
            previous_owner_id = existing_account_by_id.customer_id
            
            if previous_owner_id != customer_id:
                if not force_transfer:
                    logger.warning(f"⚠️ Instagram 계정 {instagram_user_id}의 소유권 이전이 요청되었으나 force_transfer가 False입니다. 이전 고객: {previous_owner_id}")
                    # 소유권 이전 없이 토큰만 업데이트하고 싶은 경우도 있을 수 있지만, 
                    # 보안상 여기서는 예외를 던지거나 특별한 상태를 반환합니다.
                    # 여기서는 일단 정보를 반환하기 위해 소유권을 바꾸지 않고 리턴합니다.
                    # 하지만 호출부에서 이를 감지할 수 있어야 합니다.
                    # (간단하게 하기 위해 일단 리턴하고, 호출부에서 customer_id를 대조하도록 합니다)
                    return existing_account_by_id

                logger.warning(f"⚠️ Instagram 계정 {instagram_user_id}의 소유권을 강제로 이전합니다: {previous_owner_id} -> {customer_id}")
            
            instagram_account = existing_account_by_id
            instagram_account.customer_id = customer_id  # 소유권 이전
            instagram_account.page_id = page_id or instagram_account.page_id
            instagram_account.instagram_username = instagram_username or instagram_account.instagram_username
            instagram_account.ig_id = ig_id or instagram_account.ig_id
            instagram_account.profile_picture_url = profile_picture_url
            instagram_account.followers_count = followers_count
            instagram_account.follows_count = follows_count
            instagram_account.media_count = media_count
            # [STABLE] Model now handles encryption automatically
            instagram_account.access_token = access_token
            instagram_account.token_expires_at = token_expires_at
            instagram_account.connection_status = "CONNECTED"
            instagram_account.updated_at = now
            
            logger.info(f"📝 Instagram 계정 업데이트 완료: customer_id={customer_id}, username={instagram_username}")
            
        else:
            # 3. 계정이 없으면 새로 생성
            logger.info(f"✅ 새 Instagram 계정 생성: customer_id={customer_id}")
            instagram_account = InstagramAccount(
                customer_id=customer_id,
                page_id=page_id,
                instagram_user_id=instagram_user_id,
                instagram_username=instagram_username,
                ig_id=ig_id,
                profile_picture_url=profile_picture_url,
                followers_count=followers_count,
                follows_count=follows_count,
                media_count=media_count,
                # [STABLE] Model now handles encryption automatically
                access_token=access_token,
                token_expires_at=token_expires_at,
                connection_status="CONNECTED",
                is_ai_active=True,  # Explicitly set to avoid Pydantic NoneType errors
                is_moderation_alert_active=True,  # Explicitly set
                created_at=now,
                updated_at=now,
            )
            db.add(instagram_account)
        
        if commit:
            await db.commit()
            await db.refresh(instagram_account)
        else:
            # IMPORTANT: Flush the session so that the database (or SQLAlchemy) 
            # assigns the primary key 'id' to the object.
            await db.flush()
        
        logger.info(f"✅ Instagram account object ready: id={instagram_account.id}, customer_id={instagram_account.customer_id}")
            
        # 🔥 User Access Token을 Page Access Token으로 자동 업그레이드
        if instagram_account.page_id and instagram_account.access_token:
            try:
                # MetaOAuthService를 사용하여 토큰 타입 확인 및 업그레이드
                from app.services.meta_oauth import MetaOAuthService
                from app.config import get_settings
                meta_settings = get_settings()
                meta_oauth_service = MetaOAuthService(settings=meta_settings, customer_service=self)
                
                # 토큰 타입 확인
                debug_info = await meta_oauth_service.debug_token(instagram_account.access_token)
                token_type = debug_info.get("data", {}).get("type", "Unknown")
                
                if token_type == "USER":
                    logger.info(f"🔄 User Access Token을 Page Access Token으로 업그레이드 시도: page_id={instagram_account.page_id}")
                    
                    # OAuth Account에서 User Access Token 가져오기
                    oauth_result = await db.execute(
                        select(OAuthAccount).where(
                            OAuthAccount.customer_id == customer_id,
                            OAuthAccount.provider == OAuthProvider.META,
                        )
                    )
                    oauth_account = oauth_result.scalars().first()
                    
                    if oauth_account and oauth_account.access_token:
                        # User Access Token으로 /me/accounts 호출하여 Page Access Token 획득
                        import httpx
                        async with httpx.AsyncClient() as client:
                            accounts_response = await client.get(
                                "https://graph.instagram.com/v25.0/me/accounts",
                                params={
                                    "access_token": oauth_account.access_token,
                                    "fields": "id,name,access_token",
                                },
                                timeout=10.0,
                            )
                            
                            if accounts_response.is_success:
                                accounts_data = accounts_response.json()
                                pages = accounts_data.get("data", [])
                                
                                # 해당 page_id와 일치하는 페이지 찾기
                                for page in pages:
                                    if page.get("id") == instagram_account.page_id:
                                        page_access_token = page.get("access_token")
                                        if page_access_token:
                                            logger.info(f"✅ Page Access Token 획득 성공: page_id={instagram_account.page_id}")
                                            # [STABLE] Model now handles encryption automatically
                                            instagram_account.access_token = page_access_token
                                            await db.commit()
                                            await db.refresh(instagram_account)
                                            logger.info(f"✅ Access Token이 Page Access Token으로 업데이트되었습니다.")
                                            break
                                else:
                                    logger.warning(f"⚠️ /me/accounts에서 해당 page_id를 찾을 수 없습니다.")
                                    
                                    # 페이지 ID로 직접 조회 시도
                                    page_response = await client.get(
                                        f"https://graph.instagram.com/v25.0/{instagram_account.page_id}",
                                        params={
                                            "access_token": oauth_account.access_token,
                                            "fields": "id,name,access_token",
                                        },
                                        timeout=10.0,
                                    )
                                    
                                    if page_response.is_success:
                                        page_data = page_response.json()
                                        page_access_token = page_data.get("access_token")
                                        if page_access_token:
                                            logger.info(f"✅ 페이지 직접 조회로 Page Access Token 획득 성공")
                                            # [STABLE] Model now handles encryption automatically
                                            instagram_account.access_token = page_access_token
                                            await db.commit()
                                            await db.refresh(instagram_account)
                                            logger.info(f"✅ Access Token이 Page Access Token으로 업데이트되었습니다.")
                                        else:
                                            logger.warning(f"⚠️ 페이지 직접 조회에서도 access_token을 가져올 수 없습니다.")
                                    else:
                                        logger.warning(f"⚠️ 페이지 직접 조회 실패: {page_response.status_code}")
                            else:
                                logger.warning(f"⚠️ /me/accounts 호출 실패: {accounts_response.status_code}")
                                # 계속 진행 (기존 토큰 유지)
                    else:
                        logger.warning(f"⚠️ OAuth Account를 찾을 수 없어 Page Access Token 업그레이드를 할 수 없습니다.")
                elif token_type == "PAGE":
                    logger.info(f"✅ 현재 저장된 토큰은 이미 Page Access Token입니다.")
                else:
                    logger.warning(f"⚠️ 알 수 없는 토큰 타입: {token_type}")
            except Exception as e:
                logger.error(f"❌ Page Access Token 업그레이드 중 오류 (계정은 저장됨): {str(e)}")
                # 업그레이드 실패해도 계정 저장은 성공했으므로 계속 진행
        
        # 🔥 자동 웹훅 구독 (page_id와 access_token이 있으면 자동으로 구독 시도)
        if instagram_account.page_id and instagram_account.access_token:
            try:
                # MetaOAuthService를 사용하여 웹훅 구독
                from app.services.meta_oauth import MetaOAuthService
                from app.config import get_settings
                meta_settings = get_settings()
                meta_oauth_service = MetaOAuthService(settings=meta_settings, customer_service=self)
                
                logger.info(f"🔔 Instagram 계정 저장 후 자동 웹훅 구독 시작: page_id={instagram_account.page_id}, customer_id={customer_id}")
                webhook_subscribed = await meta_oauth_service.subscribe_page_to_webhook(
                    page_id=instagram_account.page_id,
                    page_access_token=instagram_account.access_token,
                )
                if webhook_subscribed:
                    logger.info(f"✅ 웹훅 구독 자동 완료: page_id={instagram_account.page_id}, customer_id={customer_id}")
                else:
                    logger.warning(f"⚠️ 웹훅 구독 자동 실패 (계정은 저장됨): page_id={instagram_account.page_id}")
            except Exception as e:
                logger.error(f"❌ 웹훅 구독 자동 처리 중 오류 (계정은 저장됨): {str(e)}")
                # 웹훅 구독 실패해도 계정 저장은 성공했으므로 계속 진행
        
        return instagram_account

