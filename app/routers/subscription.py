from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.subscription_service import SubscriptionService
from app.routers.admin_auth import get_current_user
from app.models.customer import Customer
from pydantic import BaseModel
from typing import Optional
import uuid
from app.constants.subscription import PLANS
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/subscription", tags=["subscription"])

class PlanSchema(BaseModel):
    id: str
    name: str
    price_krw: int
    price_usd: float
    features: list[str]

class SubscriptionStatus(BaseModel):
    plan_name: str
    status: str
    next_billing_date: Optional[str]
    amount: int
    currency: str
    usage_count: int
    usage_limit: int
    last_payment_date: Optional[str] = None
    payment_method: Optional[str] = None
    card_name: Optional[str] = None
    card_number: Optional[str] = None
    # AI Insights Usage
    performance_report_count: Optional[int] = 0  # 일일 사용량 (Basic Free, AI Free) 또는 월간 사용량 (AI Starter 이상)
    performance_report_daily_count: Optional[int] = 0  # 일일 사용량 (명시적)
    performance_report_monthly_count: Optional[int] = 0  # 월간 사용량 (명시적)
    comment_analysis_count: Optional[int] = 0

class PaymentCompleteRequest(BaseModel):
    imp_uid: str  # PortOne Payment ID / Billing Key ID
    merchant_uid: str # Order ID
    plan_name: str
    amount: int
    currency: str
    billing_key: Optional[str] = None
    pg_provider: Optional[str] = None # 'tosspayments', 'paypal'
    card_name: Optional[str] = None
    card_number: Optional[str] = None




# PLANS moved to app.constants.subscription

@router.get("/plans", response_model=list[PlanSchema])
async def get_plans():
    return [
        {"id": k, "name": v["name"], "price_krw": v["price_krw"], "price_usd": v["price_usd"], "features": v["features"]}
        for k, v in PLANS.items()
    ]

@router.get("/status", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = SubscriptionService(db)
    status_data = await service.get_subscription_status(current_user.id)
    
    # Map to schema (Status data from service matches schema fields mostly)
    # Handle AI report count logic: 
    # Use performance_report_daily_count if it's a free plan, otherwise月간 count
    plan = status_data["plan_name"]
    performance_report_count = status_data.get("performance_report_count", 0)
    daily_count = status_data.get("performance_report_daily_count", 0)
    monthly_count = status_data.get("performance_report_monthly_count", 0)
    
    # If service didn't return daily/monthly explicitly, fetch 'em from the sub object
    # But wait, get_subscription_status in service should return these.
    # Let me actually check the service method return keys again.
    
    # Router specific count mapping logic (Frontend expects different things based on plan)
    if plan in ["basic-free", "free", "ai-free"]:
        perf_count = daily_count
    else:
        perf_count = monthly_count

    return SubscriptionStatus(
        plan_name=status_data["plan_name"],
        status=status_data["status"],
        next_billing_date=status_data["next_billing_date"],
        amount=status_data["amount"],
        currency=status_data["currency"],
        usage_count=status_data["usage_count"],
        usage_limit=status_data["usage_limit"],
        last_payment_date=status_data["last_payment_date"],
        payment_method=status_data["payment_method"],
        card_name=status_data["card_name"],
        card_number=status_data["card_number"],
        performance_report_count=performance_report_count, # Total/Relevant
        performance_report_daily_count=daily_count,
        performance_report_monthly_count=monthly_count,
        comment_analysis_count=status_data.get("comment_analysis_count", 0)
    )

class PaymentHistorySchema(BaseModel):
    id: str
    amount: int
    currency: str
    status: str
    paid_at: str
    card_name: Optional[str]
    card_number: Optional[str]

@router.get("/history", response_model=list[PaymentHistorySchema])
async def get_payment_history(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = SubscriptionService(db)
    history = await service.get_payment_history(current_user.id)
    
    return [
        PaymentHistorySchema(
            id=str(h.id),
            amount=h.amount,
            currency=h.currency,
            status=h.status,
            paid_at=h.paid_at.isoformat() if h.paid_at else "",
            card_name=h.card_name,
            card_number=h.card_number
        )
        for h in history
    ]

@router.get("/calculate-upgrade")
async def calculate_upgrade_price(
    new_plan_name: str,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the pro-rated price for an upgrade"""
    service = SubscriptionService(db)
    result = await service.calculate_proration(current_user.id, new_plan_name)
    
    # Get base price for the new plan
    plan_info = PLANS.get(new_plan_name, {"price_krw": 0, "price_usd": 0})
    base_price = plan_info["price_krw"] # Assuming KRW for now, or detect currency
    
    final_price = max(0, base_price - result["discount"])
    
    return {
        "is_upgrade": result["is_upgrade"],
        "base_price": base_price,
        "discount": result["discount"],
        "final_price": final_price,
        "current_plan": result.get("current_plan")
    }

@router.post("/downgrade")
async def schedule_downgrade(
    new_plan_name: str,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Schedule a downgrade for the next billing cycle"""
    service = SubscriptionService(db)
    sub = await service.update_pending_plan(current_user.id, new_plan_name)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "success", "message": f"Plan change to {new_plan_name} scheduled for next billing date."}

@router.post("/cancel")
async def cancel_subscription(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = SubscriptionService(db)
    sub = await service.cancel_subscription(current_user.id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "success", "message": "Subscription canceled successfully"}

@router.post("/refresh-recurring", include_in_schema=False)
async def refresh_recurring_payments(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger the recurring payment process for all due subscriptions.
    [Internal Admin Only] 관리자 권한이 필요합니다.
    """
    if not getattr(current_user, 'is_superuser', False):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="관리자 전용 기능입니다.")
    
    service = SubscriptionService(db)
    results = await service.process_due_subscriptions()
    return {"status": "success", "results": results}




@router.post("/webhook")
async def portone_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle PortOne V2 Webhooks (Payment.Paid, Payment.Failed, etc.)
    """
    data = await request.json()
    logger.info(f"PortOne Webhook received: {data}")
    
    event_type = data.get("type")
    
    if event_type == "Payment.Paid":
        payment_data = data.get("data", {})
        payment_id = payment_data.get("paymentId")
        custom_data = payment_data.get("customData") or {}
        customer_id_str = custom_data.get("customer_id")
        
        target_sub = None
        
        # 1. Faster Lookup: Use customData if available
        if customer_id_str:
            try:
                target_uuid = uuid.UUID(customer_id_str)
                from app.models.subscription import Subscription
                from sqlalchemy import select
                result = await db.execute(select(Subscription).where(Subscription.customer_id == target_uuid))
                target_sub = result.scalar_one_or_none()
                if target_sub:
                    logger.info(f"Webhook: Identified customer {target_uuid} via customData.")
            except Exception as e:
                logger.warning(f"Webhook: Error parsing customer_id from customData: {e}")

        # 2. Fallback: Hex shorthand scan (Legacy/Support for old auto_ payments)
        if not target_sub and payment_id and payment_id.startswith("auto_"):
            try:
                parts = payment_id.split("_")
                if len(parts) >= 2:
                    cust_hex_shorthand = parts[1]
                    from app.models.subscription import Subscription
                    from sqlalchemy import select
                    result = await db.execute(select(Subscription))
                    subs = result.scalars().all()
                    for sub in subs:
                        if sub.customer_id.hex.startswith(cust_hex_shorthand):
                            target_sub = sub
                            break
                    if target_sub:
                        logger.info(f"Webhook: Identified customer via hex shorthand fallback.")
            except Exception as e:
                logger.error(f"Webhook fallback scan failed: {e}")
        
        # 3. Process the found subscription
        if target_sub:
            try:
                # Double-check idempotency: don't re-extend if this payment was already processed
                # Although log_payment has its own check, we check here too for safety.
                from app.services.subscription_service import SubscriptionService
                service = SubscriptionService(db)
                
                # Verify logic: if the payment is for a recurring renewal (auto_) and next_billing_date is still in past, extend.
                # If it's a manual payment (sub_), it might have already been processed by /complete.
                logger.info(f"Webhook: Syncing payment for {target_sub.customer_id}")
                
                # SECURITY: 카드사 정보 등이 있으면 업데이트
                card_name = payment_data.get("card", {}).get("name")
                card_number = payment_data.get("card", {}).get("number")
                
                # Check if this specific payment ID was already logged
                from app.models.subscription import PaymentHistory
                hist_check = await db.execute(select(PaymentHistory).where(PaymentHistory.imp_uid == payment_id))
                if not hist_check.scalar_one_or_none():
                    # If not logged, this might be a background successful payment. Extend.
                    await service.extend_subscription(target_sub, card_name=card_name, card_number=card_number, commit=False)
                    await service.log_payment(
                        subscription_id=target_sub.id,
                        customer_id=target_sub.customer_id,
                        merchant_uid=payment_id,
                        imp_uid=payment_id,
                        amount=payment_data.get("amount", {}).get("total", 0),
                        status="paid",
                        currency=payment_data.get("amount", {}).get("currency", "KRW"),
                        pay_method="webhook",
                        card_name=card_name,
                        card_number=card_number,
                        commit=False
                    )
                    await db.commit()
                    logger.info(f"Webhook: Successfully processed payment {payment_id} and extended subscription.")
                else:
                    logger.info(f"Webhook: Payment {payment_id} already processed. Ignoring.")
            except Exception as e:
                logger.error(f"Webhook processing error for customer {target_sub.customer_id}: {e}")
                await db.rollback()
        
    return {"status": "ok"}

@router.post("/complete")
async def complete_payment(
    req: PaymentCompleteRequest,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify payment with PortOne API and update DB.
    ⚠️ SECURITY: 결제 상태를 서버측에서 반드시 재검증합니다.
    """
    
    logger.info(f"Verifying payment for customer {current_user.id}: {req.imp_uid}")
    service = SubscriptionService(db)
    
    try:
        # 1. 서버측 결제 검증 (PortOne API 호출)
        payment_info = await service.verify_payment(req.imp_uid)
        
        # 2. 검증 성공 시에만 구독 업데이트 (commit=False)
        sub = await service.create_or_update_subscription(
            customer_id=current_user.id,
            plan_name=req.plan_name,
            billing_key=req.billing_key or req.imp_uid, 
            pg_provider=req.pg_provider,
            amount=req.amount,
            currency=req.currency,
            card_name=payment_info.get("card", {}).get("name") or req.card_name,
            card_number=payment_info.get("card", {}).get("number") or req.card_number,
            commit=False
        )
        
        # 3. 결제 이력 로깅 (commit=False)
        await service.log_payment(
            subscription_id=sub.id,
            customer_id=current_user.id,
            merchant_uid=req.merchant_uid,
            imp_uid=req.imp_uid,
            amount=req.amount,
            status="paid",
            currency=req.currency,
            pay_method=req.pg_provider,
            card_name=sub.card_name,
            card_number=sub.card_number,
            commit=False
        )
        
        # 4. FINAL COMMIT - Atomic update
        await db.commit()
        await db.refresh(sub)
        
        logger.info(f"Payment verified and subscription activated: {sub.plan_name}")
        return {"status": "success", "subscription": sub.plan_name}
        
    except Exception as e:
        logger.error(f"Payment verification failed for {current_user.id}: {str(e)}")
        # 결제 검증 실패 시 400 에러 반환 (DB는 업데이트되지 않음)
        raise HTTPException(
            status_code=400, 
            detail=f"결제 검증에 실패했습니다: {str(e)}"
        )
