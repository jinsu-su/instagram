import hmac
import hashlib
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Query, HTTPException, Depends, status, BackgroundTasks
from fastapi.responses import Response, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session, AsyncSessionLocal
from app.config import get_settings
from app.utils.logging import get_logger
from app.services.campaign_processor import CampaignProcessor

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()

from fastapi.responses import Response, JSONResponse, PlainTextResponse

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """
    Meta Webhook Verification (GET request from Meta).
    """
    if hub_mode == "subscribe" and hub_challenge:
        expected_token = settings.meta_webhook_verify_token.get_secret_value()
        if hub_verify_token == expected_token:
            logger.info("✅ Webhook verification successful")
            return PlainTextResponse(content=hub_challenge)
        else:
            logger.warning(f"❌ Webhook verification failed: token mismatch (received token does not match configured verify token)")
            raise HTTPException(status_code=403, detail="Verification token mismatch")
    
    return PlainTextResponse(content="Invalid verification request", status_code=400)

async def background_process_webhook(data: dict, headers: dict = None):
    """
    Production Stability: Process webhook events in the background to ensure 
    the API returns 200 OK to Meta immediately.
    """
    async with AsyncSessionLocal() as db:
        try:
            # logger.debug(f"🔍 [Webhook Raw Payload] {data}")
            logger.info(f"🔍 Webhook received for object: {data.get('object')}")
            processor = CampaignProcessor(db)
            
            if data.get("object") == "instagram":
                for entry in data.get("entry", []):
                    # For mentions, the entry['id'] is often '0'.
                    # We must use Recipient-Id from headers or check other fields.
                    page_id = entry.get("id")
                    if headers and headers.get("recipient-id"):
                        page_id = headers.get("recipient-id")
                    elif page_id == "0":
                         # Fallback search if still 0 (though recipient-id should be there)
                         pass
                    
                    # Handle 'changes' (Comments, Mentions)
                    for change in entry.get("changes", []):
                        field = change.get("field")
                        value = change.get("value")
                        
                        if field == "comments":
                            comment_id = value.get("id")
                            text = value.get("text", "")
                            from_user = value.get("from", {})
                            instagram_id = from_user.get("id")
                            username = from_user.get("username")
                            media_data = value.get("media", {})
                            media_id = media_data.get("id")
                            
                            if instagram_id and page_id != instagram_id:
                                await processor.process_comment_growth(
                                    page_id=page_id,
                                    instagram_id=instagram_id,
                                    comment_id=comment_id,
                                    text=text,
                                    media_id=media_id,
                                    username=username
                                )
                            else:
                                logger.info(f"⏭️ Skipping self-comment/mention: instagram_id={instagram_id} matches page_id={page_id}")
                        
                        elif field == "mentions":
                            # Post/Comment mentions - not supported with Native IG Login (IGAA tokens)
                            # Only Story mentions (via messaging events) are supported.
                            logger.info(f"📍 [Mentions Field] Received but skipped (not supported with IGAA tokens): {value}")

                    # Handle 'messaging' (DMs, Story Mentions as messages)
                    for messaging_event in entry.get("messaging", []):
                        sender_id = messaging_event.get("sender", {}).get("id")
                        recipient_id = messaging_event.get("recipient", {}).get("id") # Our page_id
                        message_data = messaging_event.get("message", {})
                        
                        logger.info(f"📬 [Messaging Event] From: {sender_id}, To: {recipient_id}, Event: {list(messaging_event.keys())}")

                        if sender_id and recipient_id and recipient_id != sender_id:
                            raw_timestamp = messaging_event.get("timestamp")
                            created_at = None
                            if raw_timestamp:
                                try:
                                    created_at = datetime.fromtimestamp(raw_timestamp / 1000.0, tz=timezone.utc)
                                except Exception as e:
                                    logger.error(f"Error parsing timestamp {raw_timestamp}: {e}")

                            # Simplified logging for Story Mentions
                            if "attachments" in message_data:
                                att_types = [a.get("type") for a in message_data.get("attachments", [])]
                                if "story_mention" in att_types or "story_share" in att_types:
                                    logger.info(f"⭐ Story mention/share detected: mid={message_data.get('mid')}")

                            is_story_mention = False
                            if "attachments" in message_data:
                                for attachment in message_data.get("attachments", []):
                                    att_type = attachment.get("type")
                                    if att_type in ["story_mention", "story_share"]:
                                        is_story_mention = True
                                        break
                            
                            if is_story_mention:
                                await processor.process_story_mention(
                                    page_id=recipient_id, 
                                    instagram_id=sender_id,
                                    created_at=created_at,
                                    mid=message_data.get("mid")
                                )
                            else:
                                text = message_data.get("text", "")
                                username = messaging_event.get("sender", {}).get("username")
                                full_name = None
                                profile_pic = None
                                mid = message_data.get("mid")
                                
                                # Robust Profile Fetching: Use direct API for sender_id instead of iterating search
                                if (not username or not profile_pic) and sender_id:
                                    from app.models.instagram_account import InstagramAccount
                                    from sqlalchemy import select, or_
                                    
                                    result = await db.execute(
                                        select(InstagramAccount).where(
                                            or_(
                                                InstagramAccount.page_id == recipient_id,
                                                InstagramAccount.instagram_user_id == recipient_id
                                            )
                                        )
                                    )
                                    ig_account = result.scalar_one_or_none()
                                    
                                    if ig_account and ig_account.access_token:
                                        import httpx
                                        # Instagram Business Login: always use graph.instagram.com
                                        api_host = "graph.instagram.com"
                                        url = f"https://{api_host}/v25.0/{sender_id}"
                                        params = {
                                            "fields": "username,name,profile_pic",
                                            "access_token": ig_account.access_token
                                        }
                                        
                                        async with httpx.AsyncClient(timeout=5.0) as client:
                                            try:
                                                resp = await client.get(url, params=params)
                                                if resp.is_success:
                                                    p_data = resp.json()
                                                    username = p_data.get("username")
                                                    full_name = p_data.get("name")
                                                    profile_pic = p_data.get("profile_pic")
                                                    logger.info(f"✨ [Webhook] Successfully fetched profile for {sender_id}: @{username}")
                                                else:
                                                    logger.warning(f"⚠️ Profile API failed for {sender_id}: { "Response Text Masked" }")
                                            except Exception as e:
                                                logger.error(f"Failed to fetch messaging profile: {e}")
                                
                                if text:
                                    is_echo = message_data.get("is_echo", False)
                                    # Identify real page_id and real user_id based on echo
                                    real_page_id = sender_id if is_echo else recipient_id
                                    real_user_id = recipient_id if is_echo else sender_id
                                    
                                    await processor.process_welcome_message(
                                        page_id=real_page_id, 
                                        instagram_id=real_user_id, 
                                        text=text,
                                        username=username,
                                        full_name=full_name,
                                        profile_pic=profile_pic,
                                        created_at=created_at,
                                        mid=mid,
                                        is_echo=is_echo
                                    )
                                    
                            # Handle 'postback' (Button clicks in Generic Templates)
                            if "postback" in messaging_event:
                                postback_data = messaging_event.get("postback", {})
                                payload = postback_data.get("payload")
                                
                                # Process postback as a message if it contains text data or our smart-button payload
                                if payload and (payload.startswith("TEXT:") or payload.startswith("CHECK_FOLLOW_")):
                                    extracted_text = payload.replace("TEXT:", "", 1) if payload.startswith("TEXT:") else payload
                                    logger.info(f"📥 Received postback payload: {payload}. Processing as trigger: {extracted_text}")
                                    await processor.process_welcome_message(
                                        page_id=recipient_id,
                                        instagram_id=sender_id,
                                        text=extracted_text,
                                        created_at=created_at,
                                        source="postback",
                                        skip_human_handoff=True
                                    )
        except Exception as e:
            logger.error(f"❌ Critical error in background webhook processing: {e}", exc_info=True)

@router.post("/webhook")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Handle incoming Meta Webhook events (POST request from Meta).
    """
    # 0. Immediate arrival log with headers
    logger.info("🔥 [CRITICAL] WEBHOOK REQUEST RECEIVED AT /instagram/webhook")
    headers = dict(request.headers)
    logger.info(f"🚀 [Webhook Incoming] Method: {request.method}, Headers: {headers}")
    
    # 1. Read body once (can only be read once in FastAPI)
    body = await request.body()
    # logger.info(f"📦 [Webhook Body Received] Size: {len(body)} bytes")
    
    # 2. Verify Signature
    signature = request.headers.get("X-Hub-Signature-256")
    sig_verified = False
    if signature:
        try:
            expected_sig = "sha256=" + hmac.new(
                settings.meta_app_secret.get_secret_value().encode("utf-8"),
                body,
                hashlib.sha256
            ).hexdigest()
            
            if hmac.compare_digest(signature, expected_sig):
                sig_verified = True
                logger.info("✅ Signature verified successfully")
            else:
                logger.warning(f"⚠️ Signature mismatch - Expected: {expected_sig[:20]}..., Got: {signature[:20]}")
        except Exception as sig_err:
            logger.error(f"Error during signature verification: {sig_err}")

    # 3. Parse Body
    try:
        decoded_body = body.decode('utf-8')
        data = json.loads(decoded_body)
    except Exception as e:
        logger.error(f"❌ Failed to parse webhook JSON: {str(e)}")
        return JSONResponse(status_code=400, content={"status": "error", "message": "Invalid JSON"})

    # 4. Security Check: Enforce Signature Verification for Production
    if not sig_verified:
        logger.error("🛑 [SECURITY ALERT] Webhook signature verification failed! Possible spoofing attempt.")
        # In production, we MUST reject unauthorized requests to protect customer data
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    # logger.info(f"📥 Parsed Webhook Object: {data.get('object')} with {len(data.get('entry', []))} entries")

    # 5. Queue processing in the background
    background_tasks.add_task(background_process_webhook, data, dict(request.headers))

    # 6. Return 200 OK immediately
    return JSONResponse(content={"status": "ok", "message": "Event received and queued"})

