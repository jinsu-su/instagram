from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi import Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import urlencode

from app.config import get_settings
from app.database import get_db_session
from app.schemas.auth import AuthRedirect
from app.services.instagram_basic_oauth import InstagramBasicOAuthService
from app.utils.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter()


@router.get("/login", response_model=AuthRedirect)
async def instagram_basic_login(
    customer_id: str = Query(..., description="연동할 고객 ID"),
    redirect_uri: str | None = Query(default=None, description="연동 후 돌아갈 URL"),
    oauth_service: InstagramBasicOAuthService = Depends(InstagramBasicOAuthService.from_settings),
) -> AuthRedirect:
    return oauth_service.build_authorization_url(customer_id=customer_id, redirect_uri=redirect_uri)


@router.get("/callback")
@router.get("/callback")
async def instagram_basic_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_reason: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
):
    """
    Step 1: Instant Bridge Response
    Serves the branded loading UI immediately to eliminate white screen.
    """
    if error:
        logger.error(f"Instagram basic login error: {error} - {error_description}")
        frontend_base = str(settings.frontend_base_url).rstrip("/")
        error_url = f"{frontend_base}/onboard/meta?error={error}&description={error_description or ''}"
        return RedirectResponse(url=error_url)

    if not code or not state:
        return HTMLResponse(content="<h2>Error: Missing parameters</h2>", status_code=400)

    from fastapi.responses import HTMLResponse
    
    # JavaScript auto-triggers the process/finalize endpoint
    api_base = str(settings.api_base_url).rstrip("/")
    frontend_base = str(settings.frontend_base_url).rstrip("/")
    loading_html = f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AIDM - 인증 처리 중</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
            body {{ font-family: 'Pretendard', sans-serif; }}
            @keyframes blob {{
                0% {{ transform: translate(0px, 0px) scale(1); }}
                33% {{ transform: translate(30px, -50px) scale(1.1); }}
                66% {{ transform: translate(-20px, 20px) scale(0.9); }}
                100% {{ transform: translate(0px, 0px) scale(1); }}
            }}
            .animate-blob {{ animation: blob 7s infinite; }}
            .animation-delay-2000 {{ animation-delay: 2s; }}
            .animation-delay-4000 {{ animation-delay: 4s; }}
        </style>
    </head>
    <body class="bg-white min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <!-- Background Gradients (Matched with Dashboard) -->
        <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
            <div class="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-pink-100/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000"></div>
            <div class="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>
        </div>

        <div class="relative flex flex-col items-center justify-center">
            <div class="relative mb-2 animate-pulse text-center">
                <img 
                    src="{frontend_base}/assets/aidm-logo-ultra.png" 
                    alt="AIDM" 
                    style="height: 128px; width: auto; object-fit: contain;"
                />
            </div>

            <div class="-mt-6 py-0 text-center space-y-1">
                <h2 class="text-2xl font-black text-gray-900 tracking-tight">잠시만 기다려주세요</h2>
                <p class="text-gray-500 font-bold">AIDM 연결을 준비하고 있습니다...</p>
            </div>
        </div>

        <script>
            // Background call to finalize endpoint
            const finalizeUrl = `{api_base}/auth/instagram-basic/finalize?code={code}&state={state}`;
            
            fetch(finalizeUrl)
                .then(response => response.json())
                .then(data => {{
                    if (data.redirect_url) {{
                        window.location.href = data.redirect_url;
                    }} else {{
                        throw new Error(data.detail || '인증 처리 실패');
                    }}
                }})
                .catch(err => {{
                    console.error('Finalize Error:', err);
                    alert('인증 처리 중 오류가 발생했습니다: ' + err.message);
                }});
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=loading_html, status_code=200)


@router.get("/finalize")
async def instagram_basic_finalize(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    oauth_service: InstagramBasicOAuthService = Depends(InstagramBasicOAuthService.from_settings),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Step 2: Heavy Backend Processing
    Performs token exchange and DB save. Returns JSON with redirect URL.
    """
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    customer_id, redirect_after, page_id_missing, transfer_required, page_id = await oauth_service.handle_callback(code=code, state=state, db=db)

    if redirect_after:
        redirect_url = redirect_after
    else:
        frontend_base = str(settings.frontend_base_url).rstrip("/")
        redirect_url = f"{frontend_base}/dashboard"
    
    separator = "&" if ("?" in str(redirect_url)) else "?"
    
    params = {
        "customer_id": customer_id,
        "instagram_linked": "true",
    }
    if transfer_required:
        params["confirm_transfer"] = "true"
        if page_id:
            params["target_page_id"] = str(page_id)

    if page_id_missing:
        params["page_id_missing"] = "true"
        params["needs_meta_oauth"] = "true"
    else:
        params["message_ready"] = "true"
    
    final_url = f"{redirect_url}{separator}{urlencode(params)}"
    return {"success": True, "redirect_url": final_url}

@router.post("/callback/revoke", include_in_schema=False)
async def instagram_basic_revoke(request: Request):
    """
    Instagram Basic Display Deauthorize Callback
    Instagram Basic Display 앱 전용 revoke 콜백
    """
    try:
        import base64
        import hmac
        import hashlib
        import json
        from fastapi import Response
        
        form_data = await request.form()
        signed_request = form_data.get("signed_request")
        
        if not signed_request:
            logger.warning("Instagram basic revoke callback received without signed_request")
            return Response(content="ok", status_code=status.HTTP_200_OK)
        
        parts = signed_request.split('.', 1)
        if len(parts) != 2:
            logger.error("Invalid signed_request format")
            return Response(content="ok", status_code=status.HTTP_200_OK)
        
        encoded_sig, encoded_payload = parts
        
        def base64_url_decode(data: str) -> bytes:
            data = data.replace('-', '+').replace('_', '/')
            padding = 4 - len(data) % 4
            if padding != 4:
                data += '=' * padding
            return base64.b64decode(data)
        
        try:
            payload = json.loads(base64_url_decode(encoded_payload).decode('utf-8'))
            sig = base64_url_decode(encoded_sig)
        except Exception as e:
            logger.error(f"Failed to decode signed_request: {str(e)}")
            return Response(content="ok", status_code=status.HTTP_200_OK)
        
        if settings.instagram_basic_app_secret:
            app_secret = settings.instagram_basic_app_secret.get_secret_value()
            expected_sig = hmac.new(
                app_secret.encode('utf-8'),
                encoded_payload.encode('utf-8'),
                hashlib.sha256
            ).digest()
            
            if not hmac.compare_digest(sig, expected_sig):
                logger.warning("Invalid signature in Instagram basic revoke callback")
                return Response(content="ok", status_code=status.HTTP_200_OK)
        
        user_id = payload.get('user_id')
        if user_id:
            logger.info(f"Instagram basic revoke callback received for user_id: {user_id}")
            # TODO: 여기서 해당 사용자의 Instagram 계정을 비활성화하거나 삭제하는 로직 추가
        
        return Response(content="ok", status_code=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error processing Instagram basic revoke callback: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(content="ok", status_code=status.HTTP_200_OK)


@router.post("/callback/delete", include_in_schema=False)
async def instagram_basic_delete(request: Request):
    """
    Instagram Basic Display Data Deletion Request Callback (GDPR)
    Instagram Basic Display 앱 전용 data deletion 콜백
    """
    try:
        import base64
        import hmac
        import hashlib
        import json
        import secrets
        from fastapi import Response
        
        form_data = await request.form()
        signed_request = form_data.get("signed_request")
        
        if not signed_request:
            logger.warning("Instagram basic data deletion callback received without signed_request")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        
        parts = signed_request.split('.', 1)
        if len(parts) != 2:
            logger.error("Invalid signed_request format")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        
        encoded_sig, encoded_payload = parts
        
        def base64_url_decode(data: str) -> bytes:
            data = data.replace('-', '+').replace('_', '/')
            padding = 4 - len(data) % 4
            if padding != 4:
                data += '=' * padding
            return base64.b64decode(data)
        
        try:
            payload = json.loads(base64_url_decode(encoded_payload).decode('utf-8'))
            sig = base64_url_decode(encoded_sig)
        except Exception as e:
            logger.error(f"Failed to decode signed_request: {str(e)}")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        
        if settings.instagram_basic_app_secret:
            app_secret = settings.instagram_basic_app_secret.get_secret_value()
            expected_sig = hmac.new(
                app_secret.encode('utf-8'),
                encoded_payload.encode('utf-8'),
                hashlib.sha256
            ).digest()
            
            if not hmac.compare_digest(sig, expected_sig):
                logger.warning("Invalid signature in Instagram basic data deletion callback")
                return Response(
                    content=json.dumps({"url": "", "confirmation_code": ""}),
                    media_type="application/json",
                    status_code=status.HTTP_200_OK
                )
        
        user_id = payload.get('user_id')
        if user_id:
            logger.info(f"Instagram basic data deletion request received for user_id: {user_id}")
            # TODO: 여기서 해당 사용자의 모든 데이터를 삭제하는 로직 추가
            
            confirmation_code = secrets.token_urlsafe(16)
            # TODO: confirmation_code를 데이터베이스에 저장
            
            return Response(
                content=json.dumps({
                    "url": "",
                    "confirmation_code": confirmation_code
                }),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        else:
            logger.warning("Instagram basic data deletion callback received without user_id")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
    
    except Exception as e:
        logger.error(f"Error processing Instagram basic data deletion callback: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            content=json.dumps({"url": "", "confirmation_code": ""}),
            media_type="application/json",
            status_code=status.HTTP_200_OK
        )