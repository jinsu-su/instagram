from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.subscription import Subscription, PaymentHistory
from app.models.customer import Customer
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import httpx
from app.utils.logging import get_logger
from fastapi import Depends
from app.database import get_db_session
import uuid

logger = get_logger(__name__)

# PortOne API Config
PORTONE_API_URL = "https://api.portone.io"
CHANNEL_KEY_KR = "channel-key-9ae6fd6e-d1df-4d3c-8439-04fa1a849895" # Toss
CHANNEL_KEY_GLOBAL = "channel-key-d870ba02-d96d-4769-b337-ca0f7c8528d0" # PayPal v2

def mask_card_number(card_number: str = None) -> str:
    """
    카드 번호를 마스킹하여 마지막 4자리만 반환합니다.
    
    Args:
        card_number: 카드 번호 (전체 또는 마스킹된 형태)
    
    Returns:
        마지막 4자리만 포함한 문자열 (예: "1234")
    """
    if not card_number:
        return None
    
    # 이미 마스킹된 형태인지 확인 (숫자만 있는지)
    digits_only = ''.join(filter(str.isdigit, card_number))
    
    if len(digits_only) >= 4:
        # 마지막 4자리만 반환
        return digits_only[-4:]
    elif len(digits_only) > 0:
        # 4자리 미만이면 그대로 반환 (이미 마스킹된 경우일 수 있음)
        return digits_only
    else:
        # 숫자가 없으면 None 반환
        return None

class SubscriptionService:
    def __init__(self, db: AsyncSession = Depends(get_db_session)):
        self.db = db

    def map_plan_name(self, plan_name: str) -> str:
        """
        Maps frontend plan IDs to internal backend names.
        Preserves 'ai-' prefix to distinguish from basic plans.
        """
        if not plan_name:
            return "free"
        
        name = plan_name.lower()
        # If it's already a full ID like 'ai-starter' or 'basic-pro', keep it as is
        # but normalize to lowercase.
        if name in ["ai-starter", "ai-pro", "ai-business", "basic-starter", "basic-pro", "ai-free", "basic-free"]:
            return name
            
        # Fallback for legacy or partial names
        if "pro" in name:
            return "ai-pro" if "ai" in name else "basic-pro"
        if "starter" in name:
            return "ai-starter" if "ai" in name else "basic-starter"
            
        return "free"

    async def get_subscription(self, customer_id: uuid.UUID) -> Subscription:
        result = await self.db.execute(select(Subscription).where(Subscription.customer_id == customer_id))
        sub = result.scalar_one_or_none()
        
        if sub:
            # 🛡️ SECURITY: Access 시점에 항상 만료 여부를 체크하여 동기화
            await self._sync_and_validate_subscription(sub)
            
        return sub

    async def _sync_and_validate_subscription(self, sub: Subscription):
        """
        🛡️ 구독 상태 동기화 및 검증 (Auto-Downgrade)
        - 해지 예약(canceled) 상태에서 종료일이 지났다면 즉시 free로 강등
        - Active 상태인데 종료일이 지났다면 (결제 실패 등의 경우) past_due 처리
        """
        now = datetime.utcnow()
        
        # 1. 해지 예약 상태인 경우 (User canceled)
        if sub.status == "canceled":
            if sub.next_billing_date and sub.next_billing_date <= now:
                logger.info(f"🛡️ Subscription Canceled & Expired for {sub.customer_id}. Marking as EXPIRED.")
                sub.status = "expired"
                await self.db.commit()
                
        # 2. 정기 결제 플랜인데 종료일이 지난 경우 (Past due detection & Auto-Renewal)
        elif sub.status == "active" and sub.plan_name != "free":
            if sub.next_billing_date and sub.next_billing_date <= now:
                # 결제일이 지났는데 아직 상태가 active 라면, 즉시 재결제 시도 (On-demand Renewal)
                if sub.billing_key:
                    logger.info(f"🔄 Membership due for {sub.customer_id}. Attempting automatic renewal...")
                    # ⚠️ 주의: execute_recurring_payment 내에서 내부적으로 extend_subscription을 호출하여 날짜를 갱신함
                    success = await self.execute_recurring_payment(sub)
                    if success:
                        logger.info(f"✅ Automatic renewal successful for {sub.customer_id}.")
                        return
                    else:
                        logger.warning(f"❌ Automatic renewal failed for {sub.customer_id}. Setting to past_due.")
                        sub.status = "past_due"
                        await self.db.commit()
                else:
                    # 빌링 키가 없는데 결제일이 지났다면 즉시 결제 지연(past_due) 처리
                    # 바로 free로 강등하지 않고 결제를 유도함 (유저 피드백 반영)
                    logger.info(f"🛡️ No Billing Key & Date Passed for {sub.customer_id}. Setting to past_due.")
                    sub.status = "past_due"
                    await self.db.commit()

    def _downgrade_to_free(self, sub: Subscription):
        """Internal helper to reset subscription to free tier"""
        sub.plan_name = "free"
        sub.status = "active"
        sub.amount = 0
        sub.billing_key = None
        sub.usage_limit = 50
        sub.pending_plan = None
        sub.updated_at = datetime.utcnow()

    async def create_or_update_subscription(
        self, 
        customer_id: uuid.UUID, 
        plan_name: str, 
        billing_key: str = None,
        pg_provider: str = None,
        amount: int = 0,
        currency: str = "KRW",
        card_name: str = None,
        card_number: str = None,
        commit: bool = True
    ):
        sub = await self.get_subscription(customer_id)
        
        if not sub:
            sub = Subscription(
                customer_id=customer_id,
                plan_name=plan_name,
                status="active",
                current_period_start=datetime.utcnow()
            )
            self.db.add(sub)
        else:
            # Ensure status is reset to active for renewals/re-subscriptions
            sub.status = "active"
        
        # Update details
        sub.plan_name = self.map_plan_name(plan_name)
        sub.amount = amount
        sub.currency = currency
        sub.pending_plan = None
        
        # Set usage limit based on plan
        await self.update_usage_limit_for_plan(sub, sub.plan_name)
        
        if billing_key:
            sub.billing_key = billing_key
        if pg_provider:
            sub.pg_provider = pg_provider
        
        if card_name:
            sub.card_name = card_name
        if card_number:
            # ⚠️ SECURITY: 카드 번호는 마지막 4자리만 저장
            sub.card_number = mask_card_number(card_number)
            
        # Set period (Monthly)
        now = datetime.utcnow()
        sub.current_period_start = now
        sub.current_period_end = now + relativedelta(months=1)
        sub.next_billing_date = sub.current_period_end
        sub.updated_at = now
        
        if commit:
            await self.db.commit()
            await self.db.refresh(sub)
        return sub

    async def log_payment(
        self,
        subscription_id: uuid.UUID,
        customer_id: uuid.UUID,
        merchant_uid: str,
        amount: int,
        status: str,
        imp_uid: str = None,
        pay_method: str = None,
        currency: str = "KRW",
        card_name: str = None,
        card_number: str = None,
        commit: bool = True
    ):
        # Idempotency: skip if imp_uid already logged (prevent double extensions)
        if imp_uid:
            result = await self.db.execute(select(PaymentHistory).where(PaymentHistory.imp_uid == imp_uid))
            existing = result.scalar_one_or_none()
            if existing:
                logger.warning(f"Payment {imp_uid} already logged. Skipping duplicate log.")
                return existing

        payment = PaymentHistory(
            subscription_id=subscription_id,
            customer_id=customer_id,
            merchant_uid=merchant_uid,
            imp_uid=imp_uid,
            amount=amount,
            status=status,
            pay_method=pay_method,
            currency=currency,
            card_name=card_name,
            card_number=mask_card_number(card_number) if card_number else None
        )
        self.db.add(payment)
        if commit:
            await self.db.commit()
        return payment

    async def check_usage_limit(self, customer_id: uuid.UUID) -> bool:
        """
        Check if the customer has reached their monthly usage limit.
        Returns True if LIMIT REACHED (Block), False if OK.
        """
        sub = await self.get_subscription(customer_id)
        if not sub:
            # No subscription usually means new free user
            # Create default free subscription if missing
            sub = await self.create_or_update_subscription(customer_id, "free")
            
        # Block if not active (except for free plan which is always active)
        if sub.status != "active":
            return True # Locked
            
        # Unlimited plans (any paid plan is considered unlimited for basic DM messages)
        # We only block free/expired plans that reached their 50-70 limit
        if sub.plan_name not in ["free", "ai-free", "basic-free"]:
            return False
            
        return sub.usage_count >= sub.usage_limit

    async def increment_usage(self, customer_id: uuid.UUID) -> int:
        """Increment usage count and return new count"""
        sub = await self.get_subscription(customer_id)
        if sub:
            sub.usage_count += 1
            await self.db.commit()
            return sub.usage_count
        return 0

    async def check_ai_insight_access(self, customer_id: uuid.UUID, insight_type: str) -> dict:
        """
        Check if customer can access AI insights based on their plan.
        
        Args:
            customer_id: Customer UUID
            insight_type: 'performance_report', 'comment_analysis', 'lead_detection'
        
        Returns:
            {
                'allowed': bool,
                'reason': str,
                'usage_info': dict,
                'upgrade_required': bool
            }
        """
        sub = await self.get_subscription(customer_id)
        if not sub:
            sub = await self.create_or_update_subscription(customer_id, "free")
        
        plan = sub.plan_name or "free"
        is_active = sub.status == "active"
        
        # Performance Report: Basic Free와 AI Free 모두 하루 10회 제공 (맛보기)
        # 구독이 만료된 프리미엄 사용자도 무료 한도 내에서는 사용 가능하도록 허용 (전환 유도)
        if insight_type == "performance_report":
            from datetime import datetime, date
            daily_limit = 10  # 하루 10회
            
            # 일일 사용량 체크 (날짜가 바뀌면 리셋)
            today = date.today()
            last_date = sub.performance_report_last_date
            if last_date:
                last_date_only = last_date.date() if hasattr(last_date, 'date') else last_date
                if last_date_only != today:
                    # 날짜가 바뀌었으면 일일 카운트 리셋
                    sub.performance_report_daily_count = 0
                    sub.performance_report_last_date = datetime.utcnow()
                    await self.db.commit()
            else:
                # 첫 사용이면 날짜 설정
                sub.performance_report_last_date = datetime.utcnow()
                await self.db.commit()
            
            current_daily = sub.performance_report_daily_count or 0
            
            # [Security Fix] 구독이 만료되었거나 무료 플랜인 경우: 하루 10회 제공
            if not is_active or plan in ["basic-free", "free", "ai-free"]:
                reason = "오늘 바이럴 분석 한도(일 10회)를 모두 소모했습니다. 내일 다시 이용하시거나 AI 플랜으로 업그레이드하세요." if current_daily >= daily_limit else "AI 바이럴 분석 (무료 한도)"
                if not is_active and plan.startswith("ai-"):
                    reason = "구독 만료됨: 무료 한도 적용 중" if current_daily < daily_limit else "구독 만료 및 무료 한도 초과"
                
                return {
                    'allowed': current_daily < daily_limit,
                    'reason': reason,
                    'usage_info': {'current': current_daily, 'limit': daily_limit, 'period': 'daily'},
                    'upgrade_required': current_daily >= daily_limit or not is_active,
                    'recommended_plan': 'ai-starter' if not is_active else 'ai-starter'
                }
        
        # [Security Fix] 구독이 만료된 경우 다른 프리미엄 기능은 즉시 차단
        if not is_active:
            return {
                'allowed': False,
                'reason': '구독이 만료되었습니다. 다시 구독해주세요.',
                'usage_info': None,
                'upgrade_required': True,
                'recommended_plan': plan
            }

        # Basic Free: Performance Report 외에는 차단
        if plan == "basic-free" or plan == "free":
            if insight_type != "performance_report":
                return {
                    'allowed': False,
                    'reason': 'AI 기능은 AI 플랜에서만 사용 가능합니다.',
                    'usage_info': None,
                    'upgrade_required': True,
                    'recommended_plan': 'ai-free'
                }
        
        # AI Free: 제한적 제공 (Performance Report는 위에서 처리됨)
        if plan == "ai-free":
            if insight_type == "performance_report":
                # 이미 위에서 처리됨
                pass
            elif insight_type == "comment_analysis":
                limit = 5  # 최근 5개 게시물만
                current = sub.comment_analysis_count or 0
                return {
                    'allowed': current < limit,
                    'reason': '댓글 분석 한도 초과' if current >= limit else '댓글 분석',
                    'usage_info': {'current': current, 'limit': limit},
                    'upgrade_required': current >= limit,
                    'recommended_plan': 'ai-starter'
                }
            elif insight_type == "lead_detection":
                # Lead Detection은 AI Free에서도 제공 (비용 낮고 전환 유도)
                return {
                    'allowed': True,
                    'reason': 'Lead Detection 사용 가능',
                    'usage_info': None,
                    'upgrade_required': False,
                    'recommended_plan': None
                }
        
        # AI Starter 이상 (Active): 전체 제공
        if plan.startswith("ai-") and is_active:
            if insight_type == "performance_report":
                limit = self._get_performance_report_limit(plan)
                current = sub.performance_report_count or 0
                reason = "이번 달 AI 바이럴 분석 한도를 모두 사용하셨습니다. (AI Starter: 월 50회)" if current >= limit else "AI 바이럴 분석"
                return {
                    'allowed': current < limit,
                    'reason': reason,
                    'usage_info': {'current': current, 'limit': limit},
                    'upgrade_required': current >= limit,
                    'recommended_plan': 'ai-pro' if plan == 'ai-starter' else None
                }
            else:
                # 댓글 분석, Lead Detection은 무제한
                return {
                    'allowed': True,
                    'reason': '사용 가능',
                    'usage_info': None,
                    'upgrade_required': False,
                    'recommended_plan': None
                }
        
        # 기본값: 차단
        return {
            'allowed': False,
            'reason': 'AI 플랜이 필요합니다.',
            'usage_info': None,
            'upgrade_required': True,
            'recommended_plan': 'ai-starter'
        }

    async def increment_ai_insight_usage(self, customer_id: uuid.UUID, insight_type: str) -> dict:
        """
        Increment AI insight usage count.
        
        Args:
            customer_id: Customer UUID
            insight_type: 'performance_report', 'comment_analysis'
        
        Returns:
            {'success': bool, 'new_count': int, 'limit': int}
        """
        sub = await self.get_subscription(customer_id)
        if not sub:
            sub = await self.create_or_update_subscription(customer_id, "free")
        
        if insight_type == "performance_report":
            from datetime import datetime, date
            
            # 일일 사용량 증가 (날짜 체크 포함)
            today = date.today()
            last_date = sub.performance_report_last_date
            if last_date:
                last_date_only = last_date.date() if hasattr(last_date, 'date') else last_date
                if last_date_only != today:
                    # 날짜가 바뀌었으면 일일 카운트 리셋
                    sub.performance_report_daily_count = 0
                    sub.performance_report_last_date = datetime.utcnow()
            
            # 일일 카운트 증가
            sub.performance_report_daily_count = (sub.performance_report_daily_count or 0) + 1
            sub.performance_report_last_date = datetime.utcnow()
            
            # 월간 카운트도 증가 (통계용)
            sub.performance_report_count = (sub.performance_report_count or 0) + 1
            
            await self.db.commit()
            await self.db.refresh(sub)
            
            # 플랜별 제한 반환
            plan = sub.plan_name or "free"
            if plan == "basic-free" or plan == "free" or plan == "ai-free":
                # 일일 제한
                return {
                    'success': True,
                    'new_count': sub.performance_report_daily_count,
                    'limit': 10,  # 하루 10회
                    'period': 'daily'
                }
            else:
                # 월간 제한
                return {
                    'success': True,
                    'new_count': sub.performance_report_count,
                    'limit': self._get_performance_report_limit(plan),
                    'period': 'monthly'
                }
        elif insight_type == "comment_analysis":
            sub.comment_analysis_count = (sub.comment_analysis_count or 0) + 1
            await self.db.commit()
            await self.db.refresh(sub)
            return {
                'success': True,
                'new_count': sub.comment_analysis_count,
                'limit': self._get_comment_analysis_limit(sub.plan_name)
            }
        
        return {'success': False, 'new_count': 0, 'limit': 0}

    def _get_performance_report_limit(self, plan_name: str) -> int:
        """Get performance report limit for plan"""
        # Supported keys: ai-free, ai-starter, ai-pro, ai-business
        limits = {
            "ai-free": 10, # Daily usually, but mapped to 10 for safety
            "ai-starter": 50,
            "ai-pro": 100,
            "ai-business": 999999
        }
        return limits.get(plan_name.lower(), 0)

    def _get_comment_analysis_limit(self, plan_name: str) -> int:
        """Get comment analysis limit for plan"""
        limits = {
            "ai-free": 5,
            "ai-starter": 999999,
            "ai-pro": 999999,
            "ai-business": 999999
        }
        return limits.get(plan_name.lower(), 0)

    async def get_payment_history(self, customer_id: uuid.UUID) -> list[PaymentHistory]:
        """Fetch all payment history for a customer"""
        result = await self.db.execute(
            select(PaymentHistory)
            .where(PaymentHistory.customer_id == customer_id)
            .order_by(PaymentHistory.paid_at.desc())
        )
        return result.scalars().all()

    async def get_subscription_status(self, customer_id: uuid.UUID) -> dict:
        """Return structured subscription status including active/expired state"""
        sub = await self.get_subscription(customer_id)
        if not sub:
            # Default to free if no subscription exists
            sub = await self.create_or_update_subscription(customer_id, "free")
            
        # [Stability Fix] Real-time sync: if active but past due date, consider it expired/past_due
        # This acts as a fallback if the background renewal job hasn't run yet.
        now = datetime.utcnow()
        if sub.status == "active" and sub.plan_name != "free" and sub.next_billing_date and sub.next_billing_date < now:
            logger.info(f"🔄 Real-time sync: Marking customer {customer_id} subscription as expired (past due)")
            sub.status = "expired"
            sub.updated_at = now
            await self.db.commit()
            
        current_date = datetime.utcnow()
        days_left = 0
        if sub.next_billing_date:
            delta = sub.next_billing_date - current_date
            days_left = max(0, delta.days)

        # Fetch latest successful payment for this customer
        from app.models.subscription import PaymentHistory
        payment_query = await self.db.execute(
            select(PaymentHistory)
            .where(PaymentHistory.customer_id == customer_id, PaymentHistory.status == "paid")
            .order_by(PaymentHistory.paid_at.desc())
            .limit(1)
        )
        latest_payment = payment_query.scalar_one_or_none()

        # Calculate daily usage for response
        from datetime import date
        today = date.today()
        last_date = sub.performance_report_last_date
        daily_count = 0
        if last_date:
            last_date_only = last_date.date() if hasattr(last_date, 'date') else last_date
            if last_date_only == today:
                daily_count = sub.performance_report_daily_count or 0

        return {
            "plan_name": sub.plan_name,
            "status": sub.status,
            "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
            "amount": sub.amount,
            "currency": sub.currency,
            "usage_count": sub.usage_count,
            "usage_limit": sub.usage_limit,
            "days_left": days_left,
            "last_payment_date": latest_payment.paid_at.isoformat() if latest_payment else None,
            "payment_method": latest_payment.pay_method if latest_payment else None,
            "card_name": sub.card_name,
            "card_number": sub.card_number,
            # AI Insights Counts
            "performance_report_count": sub.performance_report_count or 0,
            "performance_report_daily_count": daily_count,
            "performance_report_monthly_count": sub.performance_report_count or 0,
            "comment_analysis_count": sub.comment_analysis_count or 0
        }

    async def cancel_subscription(self, customer_id: uuid.UUID):
        """Cancel subscription and clear billing key to stop recurring payments"""
        sub = await self.get_subscription(customer_id)
        if sub:
            sub.status = "canceled"
            sub.billing_key = None # Stop recurring charging
            sub.updated_at = datetime.utcnow()
            await self.db.commit()
            return sub
        return None

    async def process_due_subscriptions(self):
        """Find all subscriptions due for renewal and execute payment"""
        from app.constants.subscription import PLANS
        
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Subscription)
            .where(
                Subscription.status == "active",
                Subscription.next_billing_date <= now,
                Subscription.billing_key.is_not(None)
            )
        )
        due_subs = result.scalars().all()
        
        logger.info(f"Checking {len(due_subs)} subscriptions for renewal...")
        
        results = {"success": 0, "failed": 0, "switches": 0}
        for sub in due_subs:
            try:
                # 1. Handle Pending Plan Switches (Downgrades)
                if sub.pending_plan and sub.pending_plan in PLANS:
                    logger.info(f"Switching customer {sub.customer_id} to pending plan: {sub.pending_plan}")
                    new_plan = PLANS[sub.pending_plan]
                    sub.plan_name = sub.pending_plan
                    sub.amount = new_plan["price_krw"]
                    
                    # Update limits
                    await self.update_usage_limit_for_plan(sub, sub.plan_name)
                    sub.pending_plan = None
                    results["switches"] += 1

                # 2. Execute Payment
                success = await self.execute_recurring_payment(sub)
                if success:
                    results["success"] += 1
                else:
                    # Payment failed - mark as past_due to block access until fixed
                    sub.status = "past_due"
                    sub.updated_at = datetime.utcnow()
                    await self.db.commit()
                    results["failed"] += 1
            except Exception as loop_e:
                logger.error(f"Error processing renewal for {sub.customer_id}: {loop_e}")
                await self.db.rollback() 
                results["failed"] += 1
                continue
                
        # 3. Cleanup: Find 'active' subs that are past due but had no billing key (e.g. cancelled)
        # These should be converted to 'free' or marked as 'expired'
        cleanup_result = await self.cleanup_expired_subscriptions()
        results["cleaned_up"] = cleanup_result
                
        return results

    async def cleanup_expired_subscriptions(self) -> int:
        """
        Find active subscriptions that are past due but weren't processed 
        (e.g., missing billing key or cancelled) and mark them appropriately.
        """
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Subscription)
            .where(
                Subscription.status == "active",
                Subscription.next_billing_date < now
            )
        )
        expired_subs = result.scalars().all()
        
        count = 0
        for sub in expired_subs:
            # If it's a paid plan that passed its date, mark it past_due or expired
            if sub.plan_name != "free":
                logger.info(f"Cleanup: Marking customer {sub.customer_id} subscription as expired (past due)")
                sub.status = "expired" # Added 'expired' as a logical status
                sub.updated_at = now
                count += 1
                
        if count > 0:
            await self.db.commit()
        
        return count

    async def calculate_proration(self, customer_id: uuid.UUID, new_plan_id: str) -> dict:
        """Calculate the pro-rated amount for an upgrade"""
        sub = await self.get_subscription(customer_id)
        if not sub or sub.plan_name == "free" or sub.status == "canceled":
            return {"amount": 0, "discount": 0, "is_upgrade": True}
        
        # Define plan weights for upgrade/downgrade detection
        # Use mapped internal names for comparison
        PLAN_ORDER = {"free": 0, "starter": 1, "pro": 2}
        
        internal_new_plan = self.map_plan_name(new_plan_id)
        
        current_weight = PLAN_ORDER.get(sub.plan_name, 0)
        new_weight = PLAN_ORDER.get(internal_new_plan, 0)
        
        if new_weight <= current_weight:
            return {"amount": 0, "discount": 0, "is_upgrade": False} # Downgrade/Same
            
        # Upgrade logic
        now = datetime.utcnow()
        if not sub.current_period_end or sub.current_period_end <= now:
            return {"amount": 0, "discount": 0, "is_upgrade": True}
            
        total_duration = (sub.current_period_end - sub.current_period_start).total_seconds()
        remaining_duration = (sub.current_period_end - now).total_seconds()
        
        if total_duration <= 0:
            return {"amount": 0, "discount": 0, "is_upgrade": True}
            
        ratio = max(0.0, min(1.0, remaining_duration / total_duration))
        unused_value = int(sub.amount * ratio)
        
        return {
            "amount": unused_value, # Amount to be deducted
            "discount": unused_value,
            "is_upgrade": True,
            "current_plan": sub.plan_name
        }

    async def update_usage_limit_for_plan(self, subscription: Subscription, plan_name: str):
        """Update subscription usage limits based on the plan name"""
        # Mapping plan codes to limits
        limits = {
            "free": 50,
            "ai-free": 50,
            "basic-free": 50,
            "starter": 1000000,
            "basic-starter": 5000,
            "ai-starter": 1000, # This is usually for DM chatbot or other metrics
            "pro": 1000000,
            "basic-pro": 1000000,
            "ai-pro": 5000,
            "ai-business": 1000000 # Unlimited
        }
        
        # Default to free limit if not found
        limit = limits.get(plan_name.lower(), 50)
        subscription.usage_limit = limit
        subscription.updated_at = datetime.utcnow()
        # Note: caller is responsible for committing the session
        return subscription

    async def update_pending_plan(self, customer_id: uuid.UUID, new_plan_name: str):
        """Set a pending plan for scheduled downgrade"""
        sub = await self.get_subscription(customer_id)
        if sub:
            # Map the plan name before saving
            sub.pending_plan = self.map_plan_name(new_plan_name)
            await self.db.commit()
            return sub
        return None

    # PortOne API Token Caching (Class level to persist across requests in the same process)
    _cached_token = None
    _token_expiry = None

    async def get_portone_token(self):
        """Fetch PortOne V2 API access token with simple caching"""
        now = datetime.utcnow()
        if SubscriptionService._cached_token and SubscriptionService._token_expiry and SubscriptionService._token_expiry > now:
            return SubscriptionService._cached_token

        from app.config import get_settings
        settings = get_settings()
        secret = settings.portone_api_secret.get_secret_value() if settings.portone_api_secret else ""
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PORTONE_API_URL}/login/api-secret",
                json={"apiSecret": secret}
            )
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("accessToken")
                SubscriptionService._cached_token = token
                # Tokens usually last 30m, we cache for 25m for safety
                SubscriptionService._token_expiry = now + timedelta(minutes=25)
                return token
        return None

    async def verify_payment(self, payment_id: str) -> dict:
        """
        Verify payment status with PortOne V2 API.
        Returns payment info if PAID, otherwise raises Exception.
        """
        token = await self.get_portone_token()
        if not token:
            raise Exception("Failed to fetch PortOne API token for verification")

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{PORTONE_API_URL}/payments/{payment_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if resp.status_code != 200:
                logger.error(f"Payment verification failed: {resp.text}")
                raise Exception(f"결제 확인 실패: {resp.status_code}")

            data = resp.json()
            status = data.get("status")
            
            if status != "PAID":
                logger.warning(f"Payment {payment_id} is not PAID. Status: {status}")
                raise Exception(f"결제가 완료되지 않았습니다. 현재 상태: {status}")
                
            return data

    async def extend_subscription(self, subscription: Subscription, card_name: str = None, card_number: str = None, commit: bool = True):
        """Extend subscription period by 30 days and update billing dates"""
        now = datetime.utcnow()
        subscription.status = "active"
        subscription.current_period_start = now
        subscription.current_period_end = now + relativedelta(months=1)
        subscription.next_billing_date = subscription.current_period_end
        subscription.updated_at = now
        
        if card_name:
            subscription.card_name = card_name
        if card_number:
            # ⚠️ SECURITY: 카드 번호는 마지막 4자리만 저장
            subscription.card_number = mask_card_number(card_number)
            
        if commit:
            await self.db.commit()
            await self.db.refresh(subscription)
        return subscription

    async def execute_recurring_payment(self, subscription: Subscription):
        """Execute automated payment using stored billing key (PortOne V2)"""
        if not subscription.billing_key:
            logger.error(f"Cannot process recurring payment: No billing key for customer {subscription.customer_id}")
            return False

        token = await self.get_portone_token()
        if not token:
            logger.error("Failed to fetch PortOne API token")
            return False

        payment_id = f"auto_{subscription.customer_id.hex[:8]}_{int(datetime.utcnow().timestamp())}"
        
        payload = {
            "billingKey": subscription.billing_key,
            "orderName": f"{subscription.plan_name.upper()} Plan Monthly Renewal",
            "amount": {
                "total": subscription.amount
            },
            "currency": subscription.currency,
            "customData": { "customer_id": str(subscription.customer_id) }
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PORTONE_API_URL}/payments/{payment_id}/billing-key",
                headers={"Authorization": f"Bearer {token}"},
                json=payload
            )
            
            if resp.status_code == 200:
                logger.info(f"Recurring payment successful for {subscription.customer_id}: {payment_id}")
                # AUTOMATICALLY EXTEND PERIOD
                data = resp.json()
                payment_inner = data.get("payment", {})
                card_inner = payment_inner.get("card", {})
                
                await self.extend_subscription(
                    subscription, 
                    card_name=card_inner.get("name"), 
                    card_number=mask_card_number(card_inner.get("number")),
                    commit=False
                )
                
                # Log to payment history as well
                await self.log_payment(
                    subscription_id=subscription.id,
                    customer_id=subscription.customer_id,
                    merchant_uid=payment_id,
                    imp_uid=payment_id, 
                    amount=subscription.amount,
                    status="paid",
                    currency=subscription.currency,
                    pay_method="billing_key",
                    card_name=card_inner.get("name"),
                    card_number=mask_card_number(card_inner.get("number")),
                    commit=False
                )
                await self.db.commit()
                return True
            else:
                logger.error(f"Recurring payment failed for {subscription.customer_id}: {resp.text}")
                
                # Record failed attempt in history
                await self.log_payment(
                    subscription_id=subscription.id,
                    customer_id=subscription.customer_id,
                    merchant_uid=payment_id,
                    imp_uid=None,
                    amount=subscription.amount,
                    status="failed",
                    currency=subscription.currency,
                    pay_method="billing_key",
                    fail_reason=resp.text[:200],
                    commit=True # Failure log can be committed immediately
                )
                return False

    async def schedule_payment(self, billing_key, amount, currency, schedule_at):
        # Placeholder for explicit scheduling if needed (PortOne also supports this)
        pass
