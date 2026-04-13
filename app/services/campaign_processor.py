import httpx
import asyncio
import json
import random
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import joinedload
from datetime import datetime, time, timezone, timedelta
from typing import Optional, Dict, Any

from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.instagram_account import InstagramAccount
from app.utils.logging import get_logger
from app.config import get_settings
from app.services.contact_service import ContactService
from app.services.flow_service import FlowService
from app.services.activity_service import ActivityService
from app.services.customer_service import CustomerService
from app.services.subscription_service import SubscriptionService # Import added
from app.database import AsyncSessionLocal
from app.models.chat import ChatSession, ChatMessage
from app.services.token_refresh_service import TokenRefreshService
from app.services.rate_limiter import rate_limiter

logger = get_logger(__name__)
settings = get_settings()

# [SaaS DB Lock] PROCESSING_MIDS dictionary has been removed in favor of ProcessedWebhook DB table
# This ensures idempotency across multiple containers.
class CampaignProcessor:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.contact_service = ContactService(db)
        self.flow_service = FlowService(db)
        self.activity_service = ActivityService(db)
        self.customer_service = CustomerService()
        self.subscription_service = SubscriptionService(db) # Init added
        self.token_refresh_service = TokenRefreshService(settings, self.customer_service)

    async def _try_auto_resolve_account(self, page_id: str) -> Optional[InstagramAccount]:
        """
        SaaS Robustness: Attempt to find which customer this unregistered ID belongs to.
        This happens when page_id or ig_id is missing in our DB but we have the account token.
        """
        logger.info(f"🔄 Attempting Auto-Identity Resolution for ID: {page_id}")
        
        # 1. Broad Search: Any account that is connected but might have a mismatching page_id
        from sqlalchemy import select, or_
        result = await self.db.execute(
            select(InstagramAccount)
            .options(joinedload(InstagramAccount.customer))
            .where(InstagramAccount.connection_status == "CONNECTED")
        )
        candidates = result.scalars().all()
        
        if not candidates:
            logger.info("No candidates for auto-resolution.")
            return None

        # Sort: priority to those without IDs
        candidates.sort(key=lambda x: (x.page_id is not None, x.ig_id is not None))

        for acc in candidates:
            if not acc.access_token: continue
            
            try:
                decrypted_token = acc.access_token
                
                # IGAA tokens (Instagram native login) MUST ONLY use graph.instagram.com.
                # Standardize to graph.instagram.com for all requests
                endpoints = ["https://graph.instagram.com/v25.0"]
                
                for base_url in endpoints:
                    try:
                        async with httpx.AsyncClient(timeout=3.0) as client:
                            resp = await client.get(
                                f"{base_url}/{page_id}",
                                params={"access_token": decrypted_token, "fields": "id"}
                            )
                            if resp.is_success:
                                # Success! This token owns/can see this ID.
                                logger.info(f"✨ Auto-resolved account mapping: @{acc.instagram_username} -> ID {page_id}")
                                acc.page_id = page_id
                                acc.ig_id = page_id
                                await self.db.commit()
                                await self.db.refresh(acc)
                                return acc
                            else:
                                logger.debug(f"Auto-resolve API returned {resp.status_code} for @{acc.instagram_username} -> {page_id}: {resp.text[:200]}")
                    except Exception as e:
                        logger.debug(f"Auto-resolve HTTP error for @{acc.instagram_username}: {e}")
                        continue
            except Exception as e:
                logger.debug(f"Auto-resolve attempt for @{acc.instagram_username} failed: {e}")
                
        return None
                
        return None

    async def _handle_contact(self, customer_id: UUID, instagram_id: str, access_token: str, text: str, username: str = None, full_name: str = None, profile_pic: str = None, instagram_account: Optional[InstagramAccount] = None, media_id: str = None):
        """Helper to register contact and trigger background tasks with fresh sessions."""
        try:
            logger.info(f"🔍 Handling contact: id={instagram_id}, username={username}")
            contact = await self.contact_service.get_or_create_contact(customer_id, instagram_id, username=username, full_name=full_name, profile_pic=profile_pic, access_token=access_token)
            
            # Trigger background tasks with their own sessions to avoid "Transaction is closed" errors
            if contact:
                # 1. Profile enrichment
                asyncio.create_task(self._bg_update_profile(contact.id, access_token))
                
                # 2. AI Analysis
                if text:
                    is_mod_active = True
                    try:
                        # Avoid synchronous lazy-loading of relationships
                        if instagram_account and "customer" in instagram_account.__dict__ and instagram_account.customer:
                            is_mod_active = getattr(instagram_account.customer, "is_moderation_alert_active", True)
                        elif instagram_account:
                            is_mod_active = getattr(instagram_account, "is_moderation_alert_active", True)
                    except Exception:
                        pass
                    # Check if this specific media_id has moderation disabled
                    if is_mod_active and media_id and instagram_account and instagram_account.moderation_disabled_posts:
                        if media_id in instagram_account.moderation_disabled_posts:
                            logger.info(f"🚫 Moderation alert disabled for specific post: {media_id}")
                            is_mod_active = False
                            
                    asyncio.create_task(self._bg_run_ai_analysis(contact.id, text, is_mod_active))
            
            return contact
        except Exception as e:
            logger.error(f"Error handling contact registration: {e}")
            return None

    async def _bg_update_profile(self, contact_id: UUID, access_token: str):
        """Background task for profile enrichment with its own session."""
        async with AsyncSessionLocal() as db:
            try:
                service = ContactService(db)
                await service.update_contact_profile(contact_id, access_token)
            except Exception as e:
                logger.error(f"Background profile update failed for contact {contact_id}: {e}")

    async def _bg_run_ai_analysis(self, contact_id: UUID, text: str, is_moderation_alert_active: bool = True):
        """Background task for AI analysis with its own session."""
        async with AsyncSessionLocal() as db:
            try:
                service = ContactService(db)
                await service.run_ai_analysis(contact_id, text, is_moderation_alert_active)
            except Exception as e:
                logger.error(f"Background AI analysis failed for contact {contact_id}: {e}")

    async def process_comment_growth(self, page_id: str, instagram_id: str, comment_id: str, text: str, media_id: str, username: str = None):
        """
        Processes an incoming Instagram comment.
        1. Checks for Global Flow Keywords.
        2. Falls back to COMMENT_GROWTH campaign.
        """
        # 1. Find the Instagram account (Flexible Matching)
        # Webhook entry.id can be Page ID or Instagram Business Account ID
        result = await self.db.execute(
            select(InstagramAccount)
            .options(joinedload(InstagramAccount.customer))
            .where(
                or_(
                    InstagramAccount.page_id == page_id,
                    InstagramAccount.instagram_user_id == page_id,
                    InstagramAccount.ig_id == page_id
                )
            )
        )
        instagram_account = result.scalars().first()
        
        # Robustness Fallback: If not found, try auto-resolution
        if not instagram_account:
            instagram_account = await self._try_auto_resolve_account(page_id)
            
        if not instagram_account:
            logger.warning(f"⚠️ Webhook matching failed for ID: {page_id}. No account found in DB even after auto-resolution.")
            return

        customer = instagram_account.customer
        customer_id = instagram_account.customer_id
        
        # [STABLE] Model now handles decryption automatically
        access_token = instagram_account.access_token
        
        page_id = getattr(instagram_account, "page_id", None)
        instagram_user_id = getattr(instagram_account, "instagram_user_id", None)
        
        # Check Usage Limit / Subscription Locked
        is_locked = await self.subscription_service.check_usage_limit(customer_id)
        if is_locked:
            logger.warning(f"🚫 Subscription Locked or Usage Limit Reached for client {customer_id}. Blocking automation.")
            return
        
        # Source of Truth: Merge Customer and InstagramAccount (for persistence across account reconnects)
        customer_replies = getattr(customer, "keyword_replies", []) or []
        account_replies = getattr(instagram_account, "keyword_replies", []) or []
        
        # Merge lists (using keyword+message+media_id as uniqueness key)
        keyword_replies = list(customer_replies)
        seen = set()
        for r in keyword_replies:
            key = (r.get("keyword"), r.get("message"), r.get("media_id"))
            seen.add(key)
        for r in account_replies:
            key = (r.get("keyword"), r.get("message"), r.get("media_id"))
            if key not in seen:
                keyword_replies.append(r)
                seen.add(key)
        is_ai_active = getattr(customer, "is_ai_active", False) if customer else getattr(instagram_account, "is_ai_active", False)
        ai_operate_start = getattr(customer, "ai_operate_start", "00:00") or getattr(instagram_account, "ai_operate_start", "00:00") or "00:00"
        ai_operate_end = getattr(customer, "ai_operate_end", "23:59") or getattr(instagram_account, "ai_operate_end", "23:59") or "23:59"
        system_prompt = getattr(customer, "system_prompt", None) or getattr(instagram_account, "system_prompt", None)
        kb_url = getattr(customer, "ai_knowledge_base_url", None) or getattr(instagram_account, "ai_knowledge_base_url", None)
        kb_filename = getattr(customer, "ai_knowledge_base_filename", None) or getattr(instagram_account, "ai_knowledge_base_filename", None)
        
        # Moderation Alert Priority: Customer table (global toggle)
        is_mod_active = getattr(customer, "is_moderation_alert_active", True) if customer else getattr(instagram_account, "is_moderation_alert_active", True)

        # Register/Update Contact
        contact = await self._handle_contact(customer_id, instagram_id, access_token, text, username=username, instagram_account=instagram_account, media_id=media_id)
        
        # Pre-extract contact attributes to avoid session issues
        contact_id = getattr(contact, "id", None)
        contact_ai_summary = getattr(contact, "ai_summary", None)
        contact_tags = getattr(contact, "tags", []) or []
        
        # 0. SMART MENTION FILTER (Skip automation if comment mentions ANOTHER account)
        # However, if it mentions US, we should proceed (to handle '@bot info' style comments)
        import re
        mentions = re.findall(r"@[\w\._]+", text)
        if mentions:
            # Check if any of the mentions are NOT our bot's username
            bot_username = f"@{instagram_account.instagram_username}" if instagram_account.instagram_username else None
            logger.info(f"🔍 [Smart Filter Check] bot_username='{bot_username}', mentions={mentions}")
            
            # Resilience: If bot_username is None or generic, we are more lenient
            if not bot_username or bot_username in ["@None", "@", "@default"]:
                logger.info("ℹ️ Bot username unknown. Proceeding despite mentions for safety.")
            else:
                other_mentions = [m for m in mentions if m.lower() != bot_username.lower()]
                
                if other_mentions:
                    # [Production Robustness] Friendly Mention Logic
                    # If the other mention is one of OUR other accounts (same customer),
                    # we allow the post owner to reply on their behalf to ensure automation triggers.
                    is_friendly_mention = False
                    for m in other_mentions:
                        target_username = m.lstrip("@").lower()
                        # Quick check: does this customer own an account with this username?
                        # We use a subquery or check the customer's accounts
                        # InstagramAccount already imported at module level
                        res = await self.db.execute(
                            select(InstagramAccount).where(
                                InstagramAccount.customer_id == instagram_account.customer_id,
                                or_(
                                    InstagramAccount.instagram_username == target_username,
                                    InstagramAccount.instagram_username == target_username.lower()
                                )
                            )
                        )
                        if res.scalars().first():
                            logger.info(f"🤝 Friendly Mention detected: {m}. Proceeding with automation.")
                            is_friendly_mention = True
                            break
                    
                    if not is_friendly_mention:
                        logger.info(f"🛑 [Smart Filter] Skipping automation: Other external mentions detected {other_mentions}")
                        return
                else:
                    logger.info(f"✅ [Smart Filter] Self-mention matched or only self-mention present.")
        
        # 2. KEYWORD REPLIES (JSON Field): Highest priority for quick replies set in Dashboard
        logger.info(f"🔍 Checking Keyword Replies for {instagram_account.instagram_username}: count={len(keyword_replies) if keyword_replies else 0}")
        if keyword_replies:
             logger.debug(f"DEBUG_KEYWORDS: {json.dumps(keyword_replies)}")
             
        for kr in keyword_replies:
            if not kr.get("is_active", True):
                continue
            keyword = kr.get("keyword", "").strip()
            logger.debug(f"Comparing '{text}' with keyword '{keyword}'")
            if keyword and (keyword.lower() == text.lower().strip() or keyword.lower() in text.lower()):
                logger.info(f"✅ Keyword Reply JSON matched: '{keyword}'")
                
                dm_message = kr.get("message", "")
                link = kr.get("link", "")
                
                # [MULTI-IMAGE SUPPORT] - Handle both single image_url and multiple image_urls
                image_urls = kr.get("image_urls", [])
                if not isinstance(image_urls, list):
                    image_urls = []
                
                single_image = kr.get("image_url")
                if single_image and single_image not in image_urls:
                    image_urls.insert(0, single_image)

                if link:
                    dm_message += f"\n\n🔗 정보 확인하기: {link}"
                
                # 1. Send DM(s)
                if dm_message or kr.get("image_urls"):
                    # Increment Usage for Automation
                    await self.subscription_service.increment_usage(customer_id)
                    
                    # --- [PRO MODE] EXTRACT RICH CARD SETTINGS ---
                    raw_interaction_type = kr.get("interaction_type") or ("follow_check" if kr.get("is_follow_check") else "immediate")
                    is_follow_req = (raw_interaction_type == "follow_check")
                    
                    btn_text = kr.get("button_text") or "자세히 보기 🔍"
                    # [FIX] Use ONLY the dedicated card_image_url for the card thumbnail.
                    # Do NOT fallback to reply images — those must arrive AFTER the button is clicked.
                    c_image = kr.get("card_image_url") or None
                    c_title = kr.get("card_title") or kr.get("card_message") or "상세 정보를 확인하세요!"
                    c_subtitle = kr.get("card_subtitle") or (dm_message[:80] if dm_message else "아래 버튼을 클릭하여 상세 정보를 확인해보세요!")
                    
                    # 1a. Send ONLY the Interaction Card — NO reply images yet.
                    # Images (image_urls) are sent AFTER button click via postback retrigger.
                    await self.send_dm(
                        instagram_account, instagram_id, dm_message or "", 
                        image_url=None,  # [FIX] No reply image with card
                        comment_id=comment_id,
                        access_token=access_token,
                        page_id=page_id,
                        instagram_user_id=instagram_user_id,
                        trigger_keyword=keyword,
                        is_follow_check=is_follow_req,
                        button_text=btn_text,
                        card_image_url=c_image,
                        card_title=c_title,
                        card_subtitle=c_subtitle
                    )

                # 2. Send Public Reply (Randomized)
                reply_variations = kr.get("reply_variations", [])
                public_reply_text = ""
                if reply_variations and isinstance(reply_variations, list) and len(reply_variations) > 0:
                    public_reply_text = random.choice(reply_variations)
                    if public_reply_text:
                        await self.reply_to_comment(
                            instagram_account, comment_id, public_reply_text,
                            access_token=access_token
                        )
                        logger.info(f"✅ Sent Randomized Public Reply: '{public_reply_text}'")
                
                # Log Activity
                action_text_log = f"Sent Keyword DM: {dm_message}"
                if public_reply_text:
                    action_text_log += f" + Public Reply: {public_reply_text}"

                await self.activity_service.log_activity(
                    customer_id=customer_id,
                    contact_id=contact_id,
                    event_type="KEYWORD_REPLY",
                    trigger_source="comment",
                    trigger_text=text,
                    action_text=action_text_log
                )
                return

        # 3. UNIVERSAL AUTOMATION: Flows
        matching_flow = await self.flow_service.find_matching_flow(customer_id, text, source="comment")

        if matching_flow:
            logger.info(f"✅ Universal Flow matched: {matching_flow.name} ({matching_flow.id})")
            await self.flow_service.execute_flow(
                matching_flow.id, instagram_id, instagram_account,
                access_token=access_token,
                page_id=page_id,
                instagram_user_id=instagram_user_id,
                user_message=text,
                comment_id=comment_id,
                source="comment"
            )
            
            # Log Flow Activity
            await self.activity_service.log_activity(
                customer_id=customer_id,
                contact_id=contact.id,
                event_type="FLOW_TRIGGER",
                trigger_source="keyword",
                trigger_text=text,
                action_text=f"Executed Flow: {matching_flow.name}"
            )
            logger.info("Universal Flow execution finished.")
            return # If a flow matches, we stop here for now to avoid multiple replies
        
        logger.info("Step 3: No Flow matched. Checking Welcome Campaign.")

        # 3. CAMPAIGN FALLBACK: Find internal active COMMENT_GROWTH campaign
        result = await self.db.execute(
            select(Campaign).where(
                Campaign.customer_id == customer_id,
                Campaign.type == "COMMENT_GROWTH",
                Campaign.is_active == True
            ).order_by(Campaign.created_at.desc())
        )
        campaign = result.scalars().first()
        
        if not campaign:
            logger.info("ℹ️ No Campaign matched. Proceeding to AI Fallback.")
        else:
            config = campaign.config or {}
            keyword = config.get("keyword_trigger", "").strip()
            
            # Match keyword
            matched = False
            if not keyword:
                matched = True # No keyword means trigger on all comments
            elif keyword.lower() == text.lower().strip() or keyword.lower() in text.lower():
                matched = True
            
            if matched:
                logger.info(f"✅ Campaign matched: {campaign.name} ({campaign.id})")
                
                dm_message = config.get("dm_message", "")
                public_reply = config.get("public_reply", "")
                image_url = config.get("image_url")
                
                # 1. Send DM
                if dm_message or image_url:
                    await self.send_dm(
                        instagram_account, instagram_id, dm_message,
                        image_url=image_url,
                        comment_id=comment_id,
                        access_token=access_token,
                        page_id=page_id,
                        instagram_user_id=instagram_user_id
                    )
                
                # 2. Send Public Reply
                if public_reply:
                    await self.reply_to_comment(
                        instagram_account, comment_id, public_reply,
                        access_token=access_token
                    )
                
                # Update stats
                stats = campaign.stats or {}
                stats["total_triggered"] = stats.get("total_triggered", 0) + 1
                campaign.stats = stats
                await self.db.commit()
                return # Stop if campaign matched
        # 4. AI FALLBACK: Generate response if AI is active and in time
        logger.info(f"Checking AI for comment: is_active={is_ai_active}")
        if is_ai_active:
            import pytz
            tz_str = getattr(customer, "timezone", "Asia/Seoul") or getattr(instagram_account, "timezone", "Asia/Seoul") or "Asia/Seoul"
            try:
                tz = pytz.timezone(tz_str)
            except Exception:
                tz = pytz.timezone("Asia/Seoul")
            
            now_tz = datetime.now(tz).time()
            
            try:
                start_h, start_m = map(int, ai_operate_start.split(":"))
                end_h, end_m = map(int, ai_operate_end.split(":"))
                start_time = time(start_h, start_m)
                end_time = time(end_h, end_m)
                
                is_in_time = False
                if start_time <= end_time:
                    is_in_time = start_time <= now_tz <= end_time
                else: # Over midnight
                    is_in_time = now_tz >= start_time or now_tz <= end_time
                
                if is_in_time:
                    logger.info(f"Triggering AI Response Generation for comment (TZ: {tz_str})...")
                    
                    # 1. Monetization check
                    usage_blocked = await self.subscription_service.check_usage_limit(customer_id)
                    if usage_blocked:
                        logger.warning(f"⛔ USAGE LIMIT REACHED for customer {customer_id}")
                        return

                    # 2. Get Chat History for context
                    chat_history_str = None
                    try:
                        from app.models.chat import ChatMessage, ChatSession
                        session_result = await self.db.execute(
                            select(ChatSession).where(
                                ChatSession.customer_id == customer_id,
                                ChatSession.participant_id == instagram_id
                            )
                        )
                        session = session_result.scalar_one_or_none()
                        if session:
                            msg_result = await self.db.execute(
                                select(ChatMessage)
                                .where(ChatMessage.session_id == session.id)
                                .order_by(ChatMessage.created_at.desc())
                                .limit(5)
                            )
                            history_msgs = msg_result.scalars().all()
                            chat_history_list = []
                            for hm in reversed(history_msgs):
                                role = "브랜드" if hm.is_from_me else "고객"
                                chat_history_list.append(f"[{role}]: {hm.content}")
                            chat_history_str = "\n".join(chat_history_list)
                    except Exception as e:
                        logger.warning(f"Failed to fetch history for AI comment: {e}")

                    # 3. Generate AI response
                    ai_response = await self.contact_service.generate_ai_response(
                        user_text=text,
                        system_prompt=system_prompt,
                        ai_summary=contact_ai_summary,
                        tags=contact_tags,
                        kb_url=kb_url,
                        kb_filename=kb_filename,
                        instagram_id=instagram_id,
                        chat_history=chat_history_str
                    )

                    if ai_response:
                        # Send Public Reply
                        await self.reply_to_comment(
                            instagram_account, comment_id, ai_response,
                            access_token=access_token
                        )
                        
                        # Log Activity
                        await self.activity_service.log_activity(
                            customer_id=customer_id,
                            contact_id=contact_id,
                            event_type="AI_REPLY",
                            trigger_source="comment",
                            trigger_text=text,
                            action_text=f"AI Comment Reply: {ai_response}"
                        )
                        logger.info(f"✅ AI Comment Reply sent: {ai_response[:50]}...")
                        return
            except Exception as e:
                logger.error(f"Error in comment AI fallback: {e}")

        logger.info("ℹ️ No Keyword/Flow/Campaign matched and AI Reply was skipped or failed.")

    async def send_dm(self, account: InstagramAccount, recipient_id: str, message: str, image_url: Optional[str] = None, 
                  comment_id: Optional[str] = None, access_token: Optional[str] = None, 
                  page_id: Optional[str] = None, instagram_user_id: Optional[str] = None, 
                  is_automated: bool = True, trigger_keyword: Optional[str] = None, 
                  is_follow_check: bool = False, card_message: Optional[str] = None, 
                  button_text: Optional[str] = None, card_image_url: Optional[str] = None,
                  card_title: Optional[str] = None, card_subtitle: Optional[str] = None):
        """Sends a DM via Instagram Graph API. Supports official Private Reply via comment_id."""
        
        # 🔥 토큰 자동 갱신 적용
        access_token = access_token or await self.token_refresh_service.get_refreshed_token(self.db, account)
        
        logger.info(f"🔍 [send_dm Debug] button='{button_text}', follow={is_follow_check}, title='{card_title}', kw='{trigger_keyword}'")

        page_id = page_id or getattr(account, "page_id", None)
        instagram_user_id = instagram_user_id or getattr(account, "instagram_user_id", None)

        # 🚀 Rate Limiting
        if page_id:
            await rate_limiter.wait_for_slot(str(page_id))

        # Instagram Business Login (IGAA tokens) always use graph.instagram.com
        url = "https://graph.instagram.com/v25.0/me/messages"
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # --- IMAGE URL NORMALIZATION ---
        def normalize_url(url):
            if url and (url.startswith("/") or "localhost" in url or "127.0.0.1" in url):
                from urllib.parse import urlparse
                base_url = str(settings.api_base_url).rstrip('/')
                parsed = urlparse(url)
                normalized = f"{base_url}{parsed.path}"
                if parsed.query:
                    normalized += f"?{parsed.query}"
                return normalized
            return url

        if image_url:
            image_url = normalize_url(image_url)
            logger.info(f"📍 Normalized main image URL: {image_url}")
        if card_image_url:
            card_image_url = normalize_url(card_image_url)
            logger.info(f"📍 Normalized card image URL: {card_image_url}")

        # --- [PRO MODE] SMART BUTTON INTERACTION (GENERIC TEMPLATE) ---
        # Using the OFFICIAL Generic Template as requested for the 'Card' experience.
        if (is_follow_check or (button_text and button_text.strip())):
            logger.info(f"🔒 [Interaction Mode] Dispatching Generic Card to {recipient_id}")
            
            # Use provided settings or safe defaults
            c_title = card_title or "상세 정보를 확인하세요!"
            c_subtitle = card_subtitle or (message[:80] if message else "아래 버튼을 클릭하면 상세 내용이 전송됩니다.")
            c_image = card_image_url or image_url # Use card specific image or fallback
            btn_title = button_text or "자세히 보기 🔍"
            
            # Construct the OFFICIAL Generic Template payload
            template_payload = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [
                            {
                                "title": c_title[:80],
                                "subtitle": c_subtitle[:80],
                                "image_url": c_image if c_image else None,
                                "buttons": [
                                    {
                                        "type": "postback",
                                        "title": btn_title[:20],
                                        "payload": f"CHECK_FOLLOW_{trigger_keyword}"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
            
            # Instagram Business Login always uses graph.instagram.com
            msg_url = "https://graph.instagram.com/v25.0/me/messages"
            
            async with httpx.AsyncClient() as client:
                # 🎯 Official Meta structured format
                if comment_id:
                    recipient = {"comment_id": comment_id}
                else:
                    recipient = {"id": recipient_id}

                payload_data = {
                    "recipient": recipient,
                    "message": template_payload
                }
                logger.info(f"🛡️ [Interaction Mode] Dispatching Validated Generic Card to {recipient} through {msg_url}")
                
                try:
                    resp = await client.post(msg_url, headers=headers, json=payload_data, timeout=10.0)
                    if resp.status_code in [200, 202]:
                        logger.info(f"✅ Generic Interaction Card (Title: {c_title}) sent successfully to {recipient_id}")
                        # Ensure we STOP here and don't send individual bubbles/reliability text
                        return True 
                    else:
                        error_data = resp.json() if resp.status_code == 400 else resp.text
                        logger.error(f"❌ Meta rejected the Generic Card: {resp.status_code} - {error_data}")
                except Exception as e:
                    logger.error(f"Error during Generic Card dispatch: {e}")

        # --- 100% RELIABILITY MODE: Unified Private Reply ---
        # Instagram rejects Templates (Cards) for initial Private Replies (Error 2534022).
        # We merge text and image link into ONE bubble to ensure 100% delivery within the 1-message limit.
        if comment_id:
            logger.info(f"🛡️ [Reliability Mode] Merging private reply for {recipient_id}")
            final_message = message or ""
            if image_url:
                final_message += f"\n\n📸 사진 확인하기: {image_url}"
            
            async with httpx.AsyncClient() as client:
                payload = {
                    "recipient": {"comment_id": comment_id},
                    "message": {"text": final_message}
                }
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    if not resp.is_success:
                        logger.error(f"❌ Failed to send reliability DM: {resp.status_code} - {resp.text}")
                        # Fallback to recipient_id if comment_id fails (some cases)
                        payload["recipient"] = {"id": recipient_id}
                        resp = await client.post(url, headers=headers, json=payload)
                    
                    if resp.is_success:
                        logger.info(f"✅ Reliability DM sent successfully to {recipient_id}")
                        await self._save_message_to_db(
                            account=account, recipient_id=recipient_id, sender_id=instagram_user_id,
                            text=final_message, is_from_me=True, mid=resp.json().get("message_id"),
                            is_automated=is_automated
                        )
                        return
                except Exception as e:
                    logger.error(f"Error in reliability mode: {e}")
        
        # --- STANDARD SEPARATE BUBBLES MODE (Regular DMs) ---
        # This is used when the window is already open (no comment_id)
        async with httpx.AsyncClient() as client:
            # --- PHASE 1: Send Text Message ---
            if message:
                text_payload = {
                    "recipient": {"id": recipient_id},
                    "message": {"text": message}
                }
                try:
                    resp = await client.post(url, headers=headers, json=text_payload)
                    if resp.is_success:
                        logger.info(f"✅ Text message sent to {recipient_id}")
                        await self._save_message_to_db(
                            account=account, recipient_id=recipient_id, sender_id=instagram_user_id,
                            text=message, is_from_me=True, mid=resp.json().get("message_id"),
                            is_automated=is_automated
                        )
                    else:
                        logger.error(f"❌ Failed to send text DM: {resp.status_code} - {resp.text}")
                except Exception as e:
                    logger.error(f"Error in Phase 1 (Text): {e}")
            if image_url:
                # If message was sent above, comment_id is now None, so this will correctly use recipient_id
                image_payload = {
                    "recipient": {"comment_id": comment_id} if comment_id else {"id": recipient_id},
                    "message": {
                        "attachment": {
                            "type": "image",
                            "payload": {"url": image_url}
                        }
                    }
                }
                try:
                    resp = await client.post(url, headers=headers, json=image_payload)
                    if not resp.is_success:
                        logger.error(f"❌ Failed to send image DM: {resp.status_code} - {resp.text}")
                    else:
                        logger.info(f"✅ Image DM sent successfully to {recipient_id}")
                except Exception as e:
                    logger.error(f"Failed to send image DM: {e}")

    async def _save_message_to_db(self, account: InstagramAccount, recipient_id: str, sender_id: str, text: str, is_from_me: bool, mid: Optional[str] = None, username: str = None, created_at: Optional[datetime] = None, is_automated: bool = False):
        """Helper to save a message and update/create a chat session."""
        try:
            # 기본값 설정
            if not created_at:
                created_at = datetime.utcnow()
            elif created_at.tzinfo:
                # Ensure naive UTC for DB compatibility with TIMESTAMP WITHOUT TIME ZONE
                created_at = created_at.astimezone(timezone.utc).replace(tzinfo=None)
                
            # Participant ID is the other person (not me)
            participant_id = recipient_id if is_from_me else sender_id
            my_id = sender_id if is_from_me else recipient_id

            # 1. Find or Create Session
            stmt = select(ChatSession).where(
                ChatSession.customer_id == account.customer_id,
                ChatSession.instagram_account_id == my_id,
                ChatSession.participant_id == participant_id
            )
            result = await self.db.execute(stmt)
            session = result.scalar_one_or_none()

            if not session:
                # 1.5 Try to fetch contact info for better display
                participant_contact = await self.contact_service.get_or_create_contact(
                    account.customer_id, 
                    participant_id,
                    username=username,
                    access_token=account.access_token
                )
                
                session = ChatSession(
                    customer_id=account.customer_id,
                    instagram_account_id=my_id,
                    participant_id=participant_id,
                    participant_username=participant_contact.username,
                    participant_name=participant_contact.full_name,
                    is_read=is_from_me # If I sent it, it's 'read' by default
                )
                self.db.add(session)
                await self.db.flush()
            else:
                # Proactively update session info from contact if missing
                participant_contact = await self.contact_service.get_or_create_contact(
                    account.customer_id, 
                    participant_id,
                    access_token=account.access_token
                )
                if participant_contact.username and session.participant_username != participant_contact.username:
                    session.participant_username = participant_contact.username
                if participant_contact.full_name and session.participant_name != participant_contact.full_name:
                    session.participant_name = participant_contact.full_name
                if participant_contact.profile_pic and session.participant_profile_pic != participant_contact.profile_pic:
                    session.participant_profile_pic = participant_contact.profile_pic

            # 2. Add Message
            new_msg = ChatMessage(
                session_id=session.id,
                mid=mid,
                sender_id=sender_id,
                recipient_id=recipient_id,
                is_from_me=is_from_me,
                is_automated=is_automated,
                content=text,
                created_at=created_at
            )
            self.db.add(new_msg)

            # 3. Update Session Preview
            session.last_message_preview = text
            session.last_message_at = created_at
            if not is_from_me:
                session.is_read = False

            await self.db.commit()
            logger.info(f"💾 Message saved to DB: session={session.id}, from_me={is_from_me}")
        except Exception as e:
            logger.error(f"❌ Failed to save message to DB: {e}")
            await self.db.rollback()

    async def reply_to_comment(self, account: InstagramAccount, comment_id: str, text: str, access_token: Optional[str] = None):
        """Replies to a comment publicly."""
        # 🔥 토큰 자동 갱신 적용
        access_token = access_token or await self.token_refresh_service.get_refreshed_token(self.db, account)
        
        # 🚀 Rate Limiting
        page_id = getattr(account, "page_id", None)
        if page_id:
            await rate_limiter.wait_for_slot(str(page_id))

        # Instagram Business Login always uses graph.instagram.com
        url = f"https://graph.instagram.com/v25.0/{comment_id}/replies"
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {"message": text}
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, headers=headers, json=payload)
                if not resp.is_success:
                    logger.error(f"Failed to reply to comment {comment_id}: {resp.text}")
                    # 🔥 인증 오류 감지 및 알림
                    await self._handle_api_error(account, resp)
            except Exception as e:
                logger.error(f"Error replying to comment: {e}")

    async def process_story_mention(self, page_id: str, instagram_id: str, username: str = None, created_at: Optional[datetime] = None):
        """Processes an incoming Story Mention."""
        # Similar logic to process_comment_growth but for STORY_MENTION
        result = await self.db.execute(
            select(InstagramAccount).where(
                or_(
                    InstagramAccount.page_id == page_id,
                    InstagramAccount.instagram_user_id == page_id,
                    InstagramAccount.ig_id == page_id
                )
            )
        )
        instagram_account = result.scalar_one_or_none()
        if not instagram_account: return

        customer_id = instagram_account.customer_id
        
        # [STABLE] Model now handles decryption automatically
        access_token = instagram_account.access_token
        
        # Check Usage Limit / Subscription Locked
        is_locked = await self.subscription_service.check_usage_limit(customer_id)
        if is_locked:
            logger.warning(f"🚫 Subscription Locked for client {customer_id}. Blocking story mention automation.")
            return
        page_id = getattr(instagram_account, "page_id", None)
        instagram_user_id = getattr(instagram_account, "instagram_user_id", None)

        # Register Contact
        contact = await self._handle_contact(customer_id, instagram_id, access_token, "Story Mention", username=username, instagram_account=instagram_account)
        contact_id = getattr(contact, "id", None)

        # 1. UNIVERSAL AUTOMATION: Flow Check (Priority)
        logger.info(f"🔍 Checking Flows for story mention from {instagram_id}")
        matching_flow = await self.flow_service.find_matching_flow(customer_id, "", source="story_mention")
        if matching_flow:
            logger.info(f"✅ Story Mention Flow matched: {matching_flow.name} ({matching_flow.id})")
            
            # Increment Usage for Automation
            await self.subscription_service.increment_usage(customer_id)
            
            await self.flow_service.execute_flow(
                matching_flow.id, instagram_id, instagram_account,
                access_token=access_token,
                page_id=page_id,
                instagram_user_id=instagram_user_id,
                user_message="Story Mention",
                comment_id=None,
                source="story_mention"
            )
            
            # Log Flow Activity
            await self.activity_service.log_activity(
                customer_id=customer_id,
                contact_id=contact_id,
                event_type="FLOW_TRIGGER",
                trigger_source="story_mention",
                trigger_text="Story Mention",
                action_text=f"Executed Flow: {matching_flow.name}"
            )
            logger.info("Story Mention Flow execution finished.")
            return # If a flow matches, we stop here

        # 2. CAMPAIGN FALLBACK: STORY_MENTION Campaign
        logger.info("No Flow matched for story mention. Checking Campaign.")
        result = await self.db.execute(
            select(Campaign).where(
                Campaign.customer_id == customer_id,
                Campaign.type == "STORY_MENTION",
                Campaign.is_active == True
            ).order_by(Campaign.created_at.desc())
        )
        campaign = result.scalars().first()
        if not campaign: 
            logger.info("No STORY_MENTION campaign found.")
            return

        config = campaign.config or {}
        message = config.get("message", "")
        coupon = config.get("coupon_code", "")
        image_url = config.get("image_url")
        
        if coupon:
            message += f"\n\n🎫 쿠폰 코드: {coupon}"
            
        if message:
            # Increment Usage for Automation
            await self.subscription_service.increment_usage(customer_id)
            
            await self.send_dm(
                instagram_account, instagram_id, message, image_url,
                access_token=access_token,
                page_id=page_id,
                instagram_user_id=instagram_user_id,
                is_automated=True
            )
            
            # Update stats
            stats = campaign.stats or {}
            stats["total_triggered"] = stats.get("total_triggered", 0) + 1
            campaign.stats = stats

            # Log Story Activity
            await self.activity_service.log_activity(
                customer_id=customer_id,
                contact_id=contact_id,
                event_type="STORY_REPLY",
                trigger_source="mention",
                trigger_text="Story Mention",
                action_text=message
            )

            await self.db.commit()

    # NOTE: process_mention, _fetch_mention_details, and reply_to_mention removed.
    # Post/comment mention automation requires Facebook Business Login (EAA tokens)
    # which is not offered in this service. Story mention automation remains active.


    async def process_welcome_message(self, page_id: str, instagram_id: str, text: str, username: str = None, full_name: str = None, profile_pic: str = None, created_at: Optional[datetime] = None, mid: str = None, source: str = "dm", skip_human_handoff: bool = False, is_echo: bool = False):
        """
        Processes an incoming Instagram message.
        """
        logger.info(f"--- Processing Welcome Message: page_id={page_id}, sender={instagram_id}, mid={mid}, text='{text}', profile_pic={bool(profile_pic)} ---")
        
        # 0. DEDUPLICATION & RACE CONDITION PREVENTION
        if mid:
            # [SaaS Stability] A. Distributed DB Lock Check
            from app.models.processed_webhook import ProcessedWebhook
            from sqlalchemy.exc import IntegrityError
            
            try:
                # 1. 락 획득 시도 (동일 mid 튜플 삽입)
                db_lock = ProcessedWebhook(mid=mid)
                self.db.add(db_lock)
                await self.db.commit()
            except IntegrityError:
                # 2. 이미 다른 인스턴스/스레드에서 락을 획득하여 트랜잭션 충돌이 발생함
                await self.db.rollback()
                logger.warning(f"⏭️ Race condition blocked (DB Lock): mid={mid} is already processed by another instance.")
                return
            except Exception as e:
                # DB 장애 시 롤백하되 일단 로직은 진행 (단, 장애 복구가 시급함)
                await self.db.rollback()
                logger.error(f"🚨 DB Error during webhook lock acquisition: {e}")
            
            try:
                # B. DB Check against actual ChatMessage (Legacy fallback)
                from app.models.chat import ChatMessage
                duplicate_msg = await self.db.execute(select(ChatMessage).where(ChatMessage.mid == mid))
                if duplicate_msg.scalar_one_or_none():
                    logger.info(f"⏭️ Skipping duplicate message: mid={mid} (Found in ChatMessage table)")
                    return
            except Exception as e:
                logger.error(f"Error checking deduplication in ChatMessage DB: {e}")
        


        # 🎯 Fetch InstagramAccount and Access Token FIRST to avoid UnboundLocalError
        from app.models.instagram_account import InstagramAccount
        from sqlalchemy.orm import joinedload
        from sqlalchemy import select, or_
        
        logger.info(f"🔍 Searching InstagramAccount for {page_id}")
        result = await self.db.execute(
            select(InstagramAccount)
            .options(joinedload(InstagramAccount.customer))
            .where(
                or_(
                    InstagramAccount.page_id == page_id,
                    InstagramAccount.instagram_user_id == page_id,
                    InstagramAccount.ig_id == page_id
                )
            )
        )
        instagram_account = result.scalars().first()
        
        # 1.1 Fallback: Try auto-resolution if no direct match but we have a possible numerical ID
        if not instagram_account:
            instagram_account = await self._try_auto_resolve_account(page_id)

        if not instagram_account:
            logger.warning(f"❌ Robustness Alert: No InstagramAccount found for Webhook ID {page_id} even after auto-resolution.")
            return

        # 🔥 토큰 자동 갱신 사전 확보
        access_token = await self.token_refresh_service.get_refreshed_token(self.db, instagram_account)
        recipient_id = page_id # Alias

        # --- POSTBACK HANDLER: Handle 'CHECK_FOLLOW_' from Card ---
        if source == "postback" or (text and text.startswith("CHECK_FOLLOW_")):
            pb_payload = text 
            if pb_payload and pb_payload.startswith("CHECK_FOLLOW_"):
                keyword = pb_payload.replace("CHECK_FOLLOW_", "", 1)
                logger.info(f"🛡️ Smart-Button Triggered for keyword: {keyword}")
                
                # Find the keyword reply setting to check interaction type
                from sqlalchemy import select, or_
                from app.models.instagram_account import InstagramAccount
                
                customer = getattr(instagram_account, "customer", None)
                customer_replies = getattr(customer, "keyword_replies", []) if customer else []
                account_replies = getattr(instagram_account, "keyword_replies", []) if instagram_account else []
                
                keyword_replies = list(customer_replies)
                seen = set()
                for r in keyword_replies:
                    key = (r.get("keyword"), r.get("message"), r.get("media_id"))
                    seen.add(key)
                for r in account_replies:
                    key = (r.get("keyword"), r.get("message"), r.get("media_id"))
                    if key not in seen:
                        keyword_replies.append(r)
                        seen.add(key)
                
                action_type = "follow_check" # Default
                custom_fail_msg = None
                for kr in keyword_replies:
                    if kr.get("keyword", "").strip().lower() == keyword.lower():
                        # If it's 'immediate', we skip follow check
                        if kr.get("interaction_type") == "immediate":
                            action_type = "immediate"
                        
                        # Capture custom follow fail message if exists
                        custom_fail_msg = kr.get("follow_fail_message") or kr.get("follow_reminder_message")
                        break

                if action_type == "immediate":
                    is_following = True # Bypass
                    logger.info(f"⚡ 'Immediate' mode detected. Bypassing follow check for {instagram_id}")
                else:
                    is_following = await self.check_is_following(instagram_account, instagram_id, access_token)
                
                if is_following:
                    logger.info(f"✅ Re-triggering keyword: {keyword}")
                    await self.process_welcome_message(
                        page_id=recipient_id,
                        instagram_id=instagram_id,
                        text=keyword,
                        created_at=created_at,
                        source="follow_success"
                    )
                else:
                    logger.info(f"🚫 User {instagram_id} is NOT following. Sending reminder.")
                    # [FIX] Read from instagram_account directly
                    _our_username = getattr(instagram_account, "instagram_username", None) or "저희 계정"
                    _ig_user_id = getattr(instagram_account, "instagram_user_id", None)
                    
                    if custom_fail_msg:
                        # Support basic placeholders: @{account} or {account}
                        fail_msg = custom_fail_msg.replace("@{account}", f"@{_our_username}").replace("{account}", f"@{_our_username}")
                        logger.info(f"   Using custom follow reminder message.")
                    else:
                        fail_msg = f"먼저 저희(@{_our_username}) 계정을 팔로우해주셔야 정보를 드릴 수 있어요! 🥺\n팔로우 후 다시 위 버튼을 눌러주세요. 🙏"
                    
                    await self.send_dm(
                        instagram_account, instagram_id, fail_msg,
                        access_token=access_token,
                        page_id=page_id,
                        instagram_user_id=_ig_user_id,
                        is_automated=True
                    )
                return
            
            # If it's a postback but didn't match our pattern, we still stop here to avoid keyword collisions
            if source == "postback":
                logger.info(f"⏭️ Unhandled postback payload: {text}. Stopping here.")
                return

        try: # Top-level try block
            # Email Regex Pattern
            import re
            import secrets
            from app.services.email_service import EmailService
            
            email_pattern = r"[^@]+@[^@]+\.[^@]+"
            email_match = re.search(email_pattern, text)
            
            customer = instagram_account.customer
            customer_id = instagram_account.customer_id
            # access_token is already refreshed above


            # Check Usage Limit / Subscription Locked
            is_locked = await self.subscription_service.check_usage_limit(customer_id)
            if is_locked:
                logger.warning(f"🚫 Subscription Locked for client {customer_id}. Blocking DM automation.")
                return

            # Increment Usage for Automation
            await self.subscription_service.increment_usage(customer_id)
            
            # Source of Truth: Customer table 
            customer_replies = getattr(customer, "keyword_replies", []) or []
            account_replies = getattr(instagram_account, "keyword_replies", []) or []
            
            keyword_replies = list(customer_replies)
            seen = set()
            for r in keyword_replies:
                key = (r.get("keyword"), r.get("message"), r.get("media_id"))
                seen.add(key)
            for r in account_replies:
                key = (r.get("keyword"), r.get("message"), r.get("media_id"))
                if key not in seen:
                    keyword_replies.append(r)
                    seen.add(key)
            is_ai_active = getattr(customer, "is_ai_active", False) if customer else getattr(instagram_account, "is_ai_active", False)
            ai_operate_start = getattr(customer, "ai_operate_start", "00:00") or getattr(instagram_account, "ai_operate_start", "00:00") or "00:00"
            ai_operate_end = getattr(customer, "ai_operate_end", "23:59") or getattr(instagram_account, "ai_operate_end", "23:59") or "23:59"
            instagram_username = getattr(instagram_account, "instagram_username", None)
            instagram_user_id = getattr(instagram_account, "instagram_user_id", None)
            system_prompt = getattr(customer, "system_prompt", None) or getattr(instagram_account, "system_prompt", None)
            kb_url = getattr(customer, "ai_knowledge_base_url", None) or getattr(instagram_account, "ai_knowledge_base_url", None)
            kb_filename = getattr(customer, "ai_knowledge_base_filename", None) or getattr(instagram_account, "ai_knowledge_base_filename", None)

            logger.info(f"✅ Found account: {instagram_account.id} for Customer: {instagram_account.customer_id} (@{instagram_account.instagram_username})")

            # --- MANUALLY TRIGGERED ECHO HANDLING (Human Intervened from Phone) ---
            if is_echo:
                logger.info(f"👤 Manual human reply detected (Echo): mid={mid}")
                await self._save_message_to_db(
                    account=instagram_account,
                    recipient_id=instagram_id, # The customer who received our manual reply
                    sender_id=page_id,         # Us (the Page)
                    text=text,
                    is_from_me=True,
                    mid=mid,
                    is_automated=False         # This is the key: NOT automated
                )
                return
            # --- OPTIMIZATION: Resolve identities sequentially for session safety ---
            # Using gather on the same DB session causes "another operation is in progress" errors.
            
            # 1. Resolve/Fetch Contact (Includes ID resolving if missing)
            contact = await self._handle_contact(customer_id, instagram_id, access_token, text, username=username, full_name=full_name, profile_pic=profile_pic, instagram_account=instagram_account)
            if not contact:
                logger.error("Failed to resolve contact.")
                return

            # 2. Check Loop Prevention (Cached or API)
            sender_ig_id = contact.numeric_ig_id
            if not sender_ig_id and access_token:
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        # Instagram Business Login: use graph.instagram.com to resolve ig_id
                        resp = await client.get(
                            f"https://graph.instagram.com/v25.0/{instagram_id}",
                            params={"fields": "ig_id", "access_token": access_token}
                        )
                        if resp.is_success:
                            sender_ig_id = resp.json().get("ig_id")
                            if sender_ig_id:
                                await self.contact_service.update_numeric_ig_id(contact.id, sender_ig_id)
                except Exception as e:
                    logger.warning(f"Secondary check for numeric ID failed: {e}")

            if sender_ig_id and not is_echo:
                sender_as_account = await self.customer_service.get_instagram_account_by_ig_id(self.db, sender_ig_id)
                if sender_as_account:
                    logger.info(f"⏭️ Skipping response: Sender (ig_id={sender_ig_id}) is one of our own accounts (Loop Prevention).")
                    return

            # --- IMPORTANT: SAVE MESSAGE IMMEDIATELY TO DB FOR DEDUPLICATION ---
            # We do this as early as possible to ensure other near-simultaneous threads see it
            try:
                logger.info(f"💾 Early DB Save: mid={mid}")
                await self._save_message_to_db(
                    account=instagram_account,
                    recipient_id=instagram_account.instagram_user_id,
                    sender_id=instagram_id,
                    text=text,
                    is_from_me=False,
                    username=username,
                    created_at=created_at,
                    mid=mid,
                    is_automated=False # Incoming messages are never automated from our side
                )
            except Exception as e:
                if "unique constraint" in str(e).lower():
                     logger.info(f"⏭️ Race Condition DB Block: mid={mid} just recorded by another thread.")
                     return
                logger.error(f"Failed early message save: {e}")

            # Pre-extract contact attributes before further potential commits
            contact_id = getattr(contact, "id", None)
            contact_ai_summary = getattr(contact, "ai_summary", None)
            contact_tags = getattr(contact, "tags", []) or []
            
            # 0. EMAIL VERIFICATION FLOW
            if email_match:
                user_email = email_match.group(0)
                logger.info(f"📧 Detected potential email: {user_email}")
                
                # 1. Update Contact with email
                contact.email = user_email
                
                # 2. Generate Token
                token = secrets.token_urlsafe(32)
                contact.verification_token = token
                contact.is_email_verified = False
                await self.db.commit()
                
                # 3. Send Email (Async Background)
                email_service = EmailService()
                await email_service.send_verification_email(user_email, token)
                
                # 4. Reply to User
                reply_text = f"인증 메일을 보냈습니다! 📧\n\n[{user_email}] 메일함을 확인해주세요.\nAIDM 등록 확인 버튼을 누르면 인증이 완료됩니다."
                await self.send_dm(
                    instagram_account, instagram_id, reply_text,
                    access_token=access_token,
                    page_id=page_id,
                    instagram_user_id=instagram_user_id,
                    is_automated=True
                )
                logger.info(f"✅ Sent verification email to {user_email}")
                return
            
            logger.info(f"Step 1: Contact handling done for {instagram_id}")

            # 0. KEYWORD REPLIES (JSON Field): Check in DM context (e.g. from Card Button clicks)
            if keyword_replies:
                logger.info(f"🔍 Checking Keyword Replies for DM from {instagram_id}: count={len(keyword_replies)}")
                for kr in keyword_replies:
                    if not kr.get("is_active", True):
                        continue
                    keyword = kr.get("keyword", "").strip()
                    if keyword and (keyword.lower() == text.lower().strip() or keyword.lower() in text.lower()):
                        logger.info(f"✅ Keyword Reply JSON matched in DM: '{keyword}'")
                        
                        dm_message = kr.get("message", "")
                        link = kr.get("link", "")
                        
                        image_urls = kr.get("image_urls", [])
                        if not isinstance(image_urls, list):
                            image_urls = []
                        single_image = kr.get("image_url")
                        if single_image and single_image not in image_urls:
                            image_urls.insert(0, single_image)

                        if link:
                            dm_message += f"\n\n🔗 정보 확인하기: {link}"
                        
                        if dm_message or image_urls:
                            await self.subscription_service.increment_usage(customer_id)
                            
                            first_image = image_urls[0] if image_urls else None
                            remaining_images = image_urls[1:] if len(image_urls) > 1 else []
                            
                            btn_text = kr.get("button_text") or "자세히 보기 🔍"
                            # [FIX] Only use dedicated card image, NOT reply images
                            c_image = kr.get("card_image_url") or None
                            c_title = kr.get("card_title") or kr.get("card_message") or "상세 정보를 확인하세요!"
                            c_subtitle = kr.get("card_subtitle") or (dm_message[:80] if dm_message else "아래 버튼을 클릭하여 상세 정보를 확인해보세요!")
                            
                            raw_interaction_type = kr.get("interaction_type") or ("follow_check" if kr.get("is_follow_check") else "immediate")
                            is_follow_req = (raw_interaction_type == "follow_check")
                            
                            # 🎯 Re-trigger = button was clicked (source == 'follow_success')
                            is_retrigger = (source == "follow_success")

                            if is_retrigger:
                                # ✅ Button was clicked → send the full message WITH all images
                                await self.send_dm(
                                    instagram_account, instagram_id, dm_message or "",
                                    image_url=first_image,  # First image with message
                                    access_token=access_token,
                                    page_id=page_id,
                                    instagram_user_id=instagram_user_id,
                                    is_automated=True,
                                    trigger_keyword=keyword,
                                    is_follow_check=False,
                                    button_text=None,
                                    card_image_url=None,
                                    card_title=None,
                                    card_subtitle=None
                                )
                                # Send 2nd, 3rd images
                                for img in remaining_images:
                                    await self.send_dm(
                                        instagram_account, instagram_id, "",
                                        image_url=img,
                                        access_token=access_token,
                                        page_id=page_id,
                                        instagram_user_id=instagram_user_id,
                                        is_automated=True
                                    )
                            else:
                                # Initial trigger → send ONLY the card, NO reply images
                                await self.send_dm(
                                    instagram_account, instagram_id, "",
                                    image_url=None,  # [FIX] No reply image with card
                                    access_token=access_token,
                                    page_id=page_id,
                                    instagram_user_id=instagram_user_id,
                                    is_automated=True,
                                    trigger_keyword=keyword,
                                    is_follow_check=is_follow_req,
                                    button_text=btn_text,
                                    card_image_url=c_image,
                                    card_title=c_title,
                                    card_subtitle=c_subtitle
                                )
                                # [FIX] Images come AFTER button click, NOT here

                            # Log Activity
                            await self.activity_service.log_activity(
                                customer_id=customer_id,
                                contact_id=contact_id,
                                event_type="KEYWORD_REPLY",
                                trigger_source="dm",
                                trigger_text=text,
                                action_text=f"Sent Keyword DM: {dm_message}"
                            )
                            return # Exit after matching keyword
            
            # 1. UNIVERSAL AUTOMATION: Flow Check
            logger.info(f"Step 1: Checking Flows for customer {customer_id}")
            matching_flow = await self.flow_service.find_matching_flow(customer_id, text, source="dm")
            if matching_flow:
                await self.flow_service.execute_flow(
                    matching_flow.id, instagram_id, instagram_account,
                    access_token=access_token,
                    page_id=page_id,
                    instagram_user_id=instagram_user_id,
                    user_message=text,
                    comment_id=None,
                    source="dm"
                )
                return

            # 2. CAMPAIGN FALLBACK: Welcome
            result = await self.db.execute(
                select(Campaign).where(
                    Campaign.customer_id == customer_id,
                    Campaign.type == "WELCOME",
                    Campaign.is_active == True
                ).order_by(Campaign.created_at.desc())
            )
            campaign = result.scalars().first()
            if campaign:
                logger.info(f"✅ Welcome Campaign matched: {campaign.id}")
                config = campaign.config or {}
                message = config.get("message", "")
                buttons = config.get("buttons", [])
                image_url = config.get("image_url")
                
                if message:
                    logger.info(f"🚀 Triggering Welcome Campaign response: {campaign.id}")
                    # Send message with buttons (Quick Replies) if supported
                    await self.send_dm_with_buttons(
                        instagram_account, instagram_id, message, buttons, image_url,
                        access_token=access_token,
                        page_id=page_id,
                        instagram_user_id=instagram_user_id
                    )
                    
                    # Update stats
                    stats = campaign.stats or {}
                    stats["total_triggered"] = stats.get("total_triggered", 0) + 1
                    campaign.stats = stats
                    await self.db.commit()
                    return
            else:
                logger.info(f"ℹ️ No active Welcome campaign found for customer {customer_id}")

            # 3. AI FALLBACK: Generate response if AI is active and in time
            logger.info(f"Checking AI for DM: is_active={is_ai_active}")
            if is_ai_active:
                import pytz
                tz_str = getattr(customer, "timezone", "Asia/Seoul") or getattr(instagram_account, "timezone", "Asia/Seoul") or "Asia/Seoul"
                try:
                    tz = pytz.timezone(tz_str)
                except Exception:
                    tz = pytz.timezone("Asia/Seoul")
                
                now_tz = datetime.now(tz).time()
                
                try:
                    start_h, start_m = map(int, ai_operate_start.split(":"))
                    end_h, end_m = map(int, ai_operate_end.split(":"))
                    start_time = time(start_h, start_m)
                    end_time = time(end_h, end_m)
                    
                    is_in_time = False
                    if start_time <= end_time:
                        is_in_time = start_time <= now_tz <= end_time
                    else: # Over midnight
                        is_in_time = now_tz >= start_time or now_tz <= end_time
                    
                    logger.info(f"AI Time Check (TZ: {tz_str}): {start_time} to {end_time}, matches={is_in_time}")
                    
                    if is_in_time:
                        logger.info("Triggering AI Response Generation...")
                        
                        # [MONETIZATION] CHECK USAGE LIMIT
                        usage_blocked = await self.subscription_service.check_usage_limit(customer_id)
                        if usage_blocked:
                            logger.warning(f"⛔ USAGE LIMIT REACHED for customer {customer_id}")
                            
                            limit_msg = "⚠️ [무료 사용량 초과]\n이번 달 AI 자동 응답 사용량(50건)을 모두 소진했습니다.\n무제한 이용을 위해 플랜을 업그레이드해주세요."
                            
                            # Send limit warning only once per 24h ideally, but for now simple response
                            await self.send_dm(
                                instagram_account, instagram_id, limit_msg,
                                access_token=access_token,
                                page_id=page_id,
                                instagram_user_id=instagram_user_id,
                                is_automated=True
                            )
                            return

                        # 1. Human Handoff (AI Pause logic)
                        from app.models.chat import ChatMessage, ChatSession
                        
                        # Skip if it's an automated interaction (like postback buttons)
                        if skip_human_handoff:
                            logger.info("⏩ Bypassing Human Handoff check (Automated Interaction)")
                        else:
                            # Check if a staff member (is_from_me=True AND is_automated=False) replied manually within the last 1 hour.
                            # We use the session to find the last message.
                            stmt = select(ChatMessage).join(ChatSession).where(
                                ChatSession.participant_id == instagram_id,
                                ChatMessage.is_from_me == True,
                                ChatMessage.is_automated == False,
                                ChatMessage.created_at > datetime.utcnow() - timedelta(minutes=30)
                            ).limit(1)
                            last_manual_reply = await self.db.execute(stmt)
                            if last_manual_reply.scalar_one_or_none():
                                logger.info(f"⏭️ Human Handoff Activated: AI Pause for {instagram_id} (Manual reply within 1h)")
                                return

                        # 2. Contextual AI History
                        # Fetch the last 10 messages to give the AI context.
                        stmt = select(ChatMessage).join(ChatSession).where(
                            ChatSession.participant_id == instagram_id
                        ).order_by(ChatMessage.created_at.desc()).limit(10)
                        history_results = await self.db.execute(stmt)
                        history_msgs = history_results.scalars().all()
                        
                        chat_history_list = []
                        for hm in reversed(history_msgs):
                            role = "브랜드" if hm.is_from_me else "고객"
                            chat_history_list.append(f"[{role}]: {hm.content}")
                        chat_history_str = "\n".join(chat_history_list)

                        # Check Usage Limit
                        is_locked = await self.subscription_service.check_usage_limit(customer_id)
                        if is_locked:
                            logger.warning(f"🚫 Usage Limit Reached for {customer_id}. Blocking AI response.")
                            return

                        # Increment Usage
                        await self.subscription_service.increment_usage(customer_id)
                        
                        try:
                            ai_reply = await self.contact_service.generate_ai_response(
                                user_text=text,
                                system_prompt=system_prompt,
                                ai_summary=contact_ai_summary,
                                tags=contact_tags,
                                kb_url=kb_url,
                                kb_filename=kb_filename,
                                instagram_id=instagram_id,
                                chat_history=chat_history_str
                            )
                        except Exception as ai_err:
                            logger.error(f"AI Generation Error: {ai_err}")
                            ai_reply = None

                        if ai_reply:
                            logger.info(f"AI Reply Generated: {ai_reply[:50]}...")
                            await self.send_dm(
                                instagram_account, instagram_id, ai_reply,
                                access_token=access_token,
                                page_id=page_id,
                                instagram_user_id=instagram_user_id,
                                is_automated=True
                            )
                            logger.info(f"✅ AI auto-reply sent to {instagram_id}")
                            
                            # Log AI Activity
                            await self.activity_service.log_activity(
                                customer_id=customer_id,
                                contact_id=contact_id,
                                event_type="AI_CHAT_REPLY",
                                trigger_source="ai",
                                trigger_text=text,
                                action_text=ai_reply,
                                intent=contact_ai_summary
                            )
                        else:
                            # 4. AI Fallback Messaging
                            fallback_msg = "안녕하세요! 문의하신 내용을 담당자가 확인하고 있습니다. 잠시만 기다려 주시면 친절히 답변 도와드리겠습니다. 😊"
                            logger.warning(f"⚠️ AI generation failed for {instagram_id}. Sending fallback message.")
                            await self.send_dm(
                                instagram_account, instagram_id, fallback_msg,
                                access_token=access_token,
                                page_id=page_id,
                                instagram_user_id=instagram_user_id,
                                is_automated=True
                            )
                except Exception as e:
                    logger.error(f"AI fallback failed: {e}")

        except Exception as e:
            logger.error(f"Error in process_welcome_message: {e}")
        finally:
            # D. REMOVE FROM MEMORY LOCK
            if mid:
                # We only remove if it succeeded or crashed WITHOUT being a DB duplicate
                # If it was a DB duplicate, we stay in the set to block near-simultaneous webhooks
                # The TTL cleanup will eventually remove it.
                pass 

    async def send_dm_with_buttons(self, account: InstagramAccount, recipient_id: str, message: str, buttons: list, image_url: Optional[str] = None, access_token: Optional[str] = None, page_id: Optional[str] = None, instagram_user_id: Optional[str] = None, comment_id: Optional[str] = None):
        """Sends a DM with quick reply buttons."""
        # 🔥 토큰 자동 갱신 적용
        access_token = access_token or await self.token_refresh_service.get_refreshed_token(self.db, account)
        
        page_id = page_id or getattr(account, "page_id", None)
        instagram_user_id = instagram_user_id or getattr(account, "instagram_user_id", None)

        # Instagram Business Login always uses graph.instagram.com
        url = "https://graph.instagram.com/v25.0/me/messages"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            if image_url:
                await self.send_dm(
                    account, recipient_id, "", image_url,
                    access_token=access_token,
                    page_id=page_id,
                    instagram_user_id=instagram_user_id,
                    comment_id=comment_id,
                    is_automated=True
                )

            payload = {
                "recipient": {"id": recipient_id} if not comment_id else {"comment_id": comment_id},
                "message": {
                    "text": message
                }
            }
            
            if buttons:
                payload["message"]["quick_replies"] = [
                    {
                        "content_type": "text",
                        "title": (btn.get("label") or btn.get("title") or btn)[:20] if isinstance(btn, dict) else str(btn)[:20],
                        "payload": btn.get("payload", f"WELCOME_BTN_{i}") if isinstance(btn, dict) else f"WELCOME_BTN_{i}"
                    } for i, btn in enumerate(buttons)
                ]

            try:
                resp = await client.post(url, headers=headers, json=payload)
                if not resp.is_success:
                    logger.error(f"Failed to send button DM: {resp.text}")
                    # 🔥 인증 오류 감지 및 알림
                    await self._handle_api_error(account, resp)
                else:
                    logger.info(f"✅ DM with buttons sent to {recipient_id}")
                    # Save outgoing message to DB
                    await self._save_message_to_db(
                        account=account,
                        recipient_id=recipient_id,
                        sender_id=instagram_user_id,
                        text=message,
                        is_from_me=True,
                        mid=resp.json().get("message_id"),
                        is_automated=True
                    )
            except Exception as e:
                logger.error(f"Error sending button DM: {e}")

    async def send_generic_card(self, account: InstagramAccount, recipient_id: str, title: str, subtitle: Optional[str] = None, image_url: Optional[str] = None, buttons: list = None, access_token: Optional[str] = None, page_id: Optional[str] = None, instagram_user_id: Optional[str] = None, comment_id: Optional[str] = None):
        """Sends a Generic Template card with image, title, subtitle, and buttons."""
        access_token = access_token or await self.token_refresh_service.get_refreshed_token(self.db, account)
        page_id = page_id or getattr(account, "page_id", None)
        instagram_user_id = instagram_user_id or getattr(account, "instagram_user_id", None)

        # Instagram Business Login always uses graph.instagram.com
        url = "https://graph.instagram.com/v25.0/me/messages"
        
        headers = {"Authorization": f"Bearer {access_token}"}

        # Handling local image URL for public access
        if image_url and ("localhost" in image_url or "127.0.0.1" in image_url):
            from urllib.parse import urlparse
            base_url = str(settings.api_base_url).rstrip('/')
            parsed = urlparse(image_url)
            image_url = f"{base_url}{parsed.path}"

        # 🚀 Rate Limiting
        if page_id:
            await rate_limiter.wait_for_slot(str(page_id))

        template_buttons = []
        if buttons:
            for i, btn in enumerate(buttons[:3]): # Max 3 buttons
                btn_title = (btn.get("label") or btn.get("title") or btn)[:20] if isinstance(btn, dict) else str(btn)[:20]
                btn_url = btn.get("url") if isinstance(btn, dict) else None
                
                if btn_url:
                    template_buttons.append({
                        "type": "web_url",
                        "url": btn_url,
                        "title": btn_title
                    })
                else:
                    template_buttons.append({
                        "type": "postback",
                        "title": btn_title,
                        "payload": btn.get("payload", f"CARD_BTN_{i}") if isinstance(btn, dict) else f"CARD_BTN_{i}"
                    })

        payload = {
            "recipient": {"id": recipient_id} if not comment_id else {"comment_id": comment_id},
            "message": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [
                            {
                                "title": title[:80],
                                "subtitle": (subtitle or "")[:80],
                                "image_url": image_url,
                                "buttons": template_buttons
                            }
                        ]
                    }
                }
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, headers=headers, json=payload)
                if not resp.is_success:
                    logger.error(f"Failed to send generic card: {resp.text}")
                    await self._handle_api_error(account, resp)
                else:
                    logger.info(f"✅ Generic card sent successfully to {recipient_id}")
                    await self._save_message_to_db(
                        account=account,
                        recipient_id=recipient_id,
                        sender_id=instagram_user_id,
                        text=f"[Card] {title}",
                        is_from_me=True,
                        mid=resp.json().get("message_id"),
                        is_automated=True
                    )
            except Exception as e:
                logger.error(f"Error sending generic card: {e}")




    async def _handle_api_error(self, account: InstagramAccount, response: httpx.Response):
        """Meta/Instagram API 응답 에러를 분석하고 필요시 계정 연결 끊김 알림을 생성합니다."""
        try:
            error_data = response.json().get("error", {})
            error_code = error_data.get("code")
            error_subcode = error_data.get("error_subcode")
            error_msg = error_data.get("message", "Unknown error")
            
            # 1. 인증 오류 (401 Unauthorized 또는 Code 190)
            # Code 190: Access token has expired, or the user has changed their password.
            if response.status_code == 401 or error_code == 190:
                logger.error(f"🚨 Unrecoverable token error detected for @{account.instagram_username}: {error_msg} (code: {error_code}, subcode: {error_subcode})")
                
                # 계정 상태를 DISCONNECTED로 업데이트
                account.connection_status = "DISCONNECTED"
                await self.db.commit()
                
                # 대시보드 알림벨에 노출될 수 있도록 활동 로그에 기록
                await self.activity_service.log_activity(
                    customer_id=account.customer_id,
                    event_type="AUTH_ERROR", # 알림벨 UI에서 필터링 가능
                    trigger_source="system",
                    trigger_text="API Authentication Failure",
                    action_text=f"인스타그램 계정(@{account.instagram_username})의 연동이 해제되었습니다. 비밀번호 변경 등이 원인일 수 있으니 재로그인이 필요합니다.",
                    status="FAILED"
                )
                
                # 필요시 DB에서 계정 상태를 업데이트하는 로직을 추가할 수 있습니다.
        except Exception as e:
            logger.error(f"Error in _handle_api_error: {e}")

    async def check_is_following(self, account: InstagramAccount, instagram_id: str, access_token: str) -> bool:
        """Checks if the user (instagram_id) follows the business account.
        
        Returns True if following, False if not following.
        IMPORTANT: Returns True on API failure to avoid blocking legitimate followers
        when Meta's API is temporarily unavailable or returns an unexpected error.
        """
        try:
            api_host = "graph.instagram.com"
            url = f"https://{api_host}/v25.0/{instagram_id}"
            params = {
                "fields": "is_user_follow_business",
                "access_token": access_token
            }
            logger.info(f"🔍 Follow Check API: GET {api_host}/v25.0/{instagram_id}?fields=is_user_follow_business")
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, params=params)
                if resp.is_success:
                    data = resp.json()
                    # The field may be missing from response if permission not granted — default to True (give benefit of doubt)
                    if "is_user_follow_business" not in data:
                        logger.warning(f"⚠️ Follow Check: 'is_user_follow_business' field missing in response for {instagram_id}. Response: {data}. Defaulting to True.")
                        return True
                    is_following = data.get("is_user_follow_business", True)
                    logger.info(f"🔍 Follow Check for {instagram_id}: is_following={is_following}")
                    return bool(is_following)
                else:
                    # API error (400, 403, etc.) — do NOT block user, default to True
                    logger.warning(f"⚠️ Follow Check API returned {resp.status_code} for {instagram_id}: {resp.text[:300]}. Defaulting to True (benefit of doubt).")
                    return True
        except Exception as e:
            logger.error(f"Error checking follow status for {instagram_id}: {e}. Defaulting to True.")
            return True
