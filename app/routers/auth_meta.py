from __future__ import annotations

import base64
import hmac
import hashlib
import json
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi import Request
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import AuthRedirect, MetaCallbackResult, MetaTokenCallbackRequest
from app.services.meta_oauth import MetaOAuthService
from app.database import get_db_session
from app.utils.logging import get_logger
from app.config import get_settings

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


@router.get("/login", response_model=AuthRedirect)
async def meta_login(
    redirect_uri: str | None = Query(default=None, description="Override onboarding redirect path after success"),
    use_business_login: bool = Query(default=False, description="Use Facebook Login for Business (response_type=token) or standard OAuth (response_type=code). 기본값은 False(code 방식)로 모든 권한을 확실히 받기 위해"),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
) -> AuthRedirect:
    """Start Meta OAuth flow for Facebook/Instagram permissions.
    
    ⚠️ 중요: use_business_login=False (기본값) 권장
      - response_type=code 방식 사용
      - 모든 권한(pages_read_engagement, pages_manage_metadata 등)이 토큰에 포함됨
      - Page Access Token 획득에 필수적인 권한들이 확실히 포함됨
    
    use_business_login=True: Facebook Login for Business 방식 (response_type=token)
      - Instagram 프로페셔널 계정 전환 등을 자동 처리
      - ⚠️ 하지만 일부 권한(pages_read_engagement, pages_manage_metadata)이 토큰에 포함되지 않을 수 있음
      - Page Access Token 획득 실패 가능성 높음
    """
    auth_url, state = oauth_service.build_authorization_url(redirect_uri=redirect_uri, use_business_login=use_business_login)
    return AuthRedirect(authorization_url=auth_url, state=state)


@router.get("/callback")
async def meta_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    granted_scopes: str | None = Query(default=None),
    denied_scopes: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_reason: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
):
    """
    Step 1: Instant Bridge Response
    Serves the branded loading UI immediately to eliminate white screen.
    """
    if error:
        logger.error(f"Meta OAuth error: {error} - {error_description}")
        frontend_url = str(settings.frontend_base_url)
        error_redirect = f"{frontend_url}/dashboard?error={error}&error_reason={error_reason or ''}&error_description={error_description or ''}"
        return RedirectResponse(url=error_redirect)

    from fastapi.responses import HTMLResponse
    api_base = str(settings.api_base_url).rstrip("/")
    frontend_base = str(settings.frontend_base_url).rstrip("/")
    
    # JavaScript auto-triggers the process/finalize endpoint or handles fragments
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
            // Check for fragment (Business Login) or code (Standard Login)
            const hash = window.location.hash.substring(1);
            if (hash && hash.includes('access_token')) {{
                // Handle Fragment token (Business Login)
                const params = new URLSearchParams(hash);
                const access_token = params.get('access_token');
                const long_lived_token = params.get('long_lived_token');
                const urlParams = new URLSearchParams(window.location.search);
                const finalState = params.get('state') || urlParams.get('state') || '{state or ""}';

                fetch('{api_base}/auth/meta/callback/token', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ access_token, long_lived_token, state: finalState }})
                }})
                .then(r => r.json())
                .then(data => {{
                    if (data.redirect_url) window.location.href = data.redirect_url;
                    else throw new Error(data.detail || '인증 완료 실패');
                }})
                .catch(err => alert('오류: ' + err.message));
            }} else if ('{code or ""}') {{
                // Handle Standard Code callback
                const finalizeUrl = `{api_base}/auth/meta/finalize?code={code or ""}&state={state or ""}`;
                fetch(finalizeUrl)
                    .then(r => r.json())
                    .then(data => {{
                        if (data.redirect_url) window.location.href = data.redirect_url;
                        else throw new Error(data.detail || '인증 완료 실패');
                    }})
                    .catch(err => alert('오류: ' + err.message));
            }} else {{
                alert('인증 파라미터가 누락되었습니다.');
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=loading_html, status_code=200)


@router.get("/finalize")
async def meta_finalize(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Step 2: Heavy Backend Processing
    Performs token exchange and DB save for standard OAuth.
    """
    try:
        result: MetaCallbackResult = await oauth_service.handle_callback(code=code, state=state, db=db)
        return {"success": True, "redirect_url": str(result.redirect_url)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Meta OAuth callback: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e)}




@router.post("/callback/token")
async def meta_callback_token(
    request: MetaTokenCallbackRequest,
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    db: AsyncSession = Depends(get_db_session),
) -> Response:
    """
    Facebook Login for Business 방식: 프론트엔드에서 fragment(#)로 받은 토큰 처리
    
    Facebook Login for Business는 response_type=token을 사용하여
    리디렉션 URL의 fragment(#)에 토큰을 반환합니다.
    프론트엔드에서 fragment를 추출하여 이 엔드포인트로 POST 요청해야 합니다.
    
    Fragment 형식:
    #access_token=...&long_lived_token=...&state=...
    
    JavaScript에서 처리할 수 있도록 JSON으로 redirect_url을 반환합니다.
    """
    from fastapi.responses import JSONResponse
    
    try:
        logger.info("Processing Meta OAuth callback with token (Facebook Login for Business 방식)")
        result: MetaCallbackResult = await oauth_service.handle_callback_with_token(
            access_token=request.access_token,
            long_lived_token=request.long_lived_token,
            state=request.state,
            db=db,
        )
        logger.info(f"OAuth callback successful, redirecting to {result.redirect_url}")
        # JSON으로 redirect_url 반환 (JavaScript에서 처리)
        return JSONResponse(content={"redirect_url": str(result.redirect_url)})
    
    except HTTPException as e:
        # HTTPException도 JSON으로 반환
        frontend_url = str(settings.frontend_base_url)
        error_redirect = f"{frontend_url}/dashboard?error={e.status_code}&error_description={e.detail}"
        return JSONResponse(
            status_code=e.status_code,
            content={"redirect_url": error_redirect, "error": e.detail}
        )
    except Exception as e:
        logger.error(f"Unexpected error in Meta OAuth token callback: {str(e)}")
        logger.error(traceback.format_exc())
        frontend_url = str(settings.frontend_base_url)
        error_redirect = f"{frontend_url}/dashboard?error=internal_error&error_description={str(e)}"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"redirect_url": error_redirect, "error": str(e)}
        )


@router.post("/callback/revoke", include_in_schema=False)
async def meta_revoke(request: Request):
    """
    Facebook Deauthorize Callback 엔드포인트
    사용자가 앱 권한을 취소할 때 Facebook이 호출하는 콜백입니다.
    HTTPS가 필요하므로 개발 환경에서는 ngrok URL을 사용해야 합니다.
    """
    try:
        form_data = await request.form()
        signed_request = form_data.get("signed_request")
        
        if not signed_request:
            logger.warning("Meta revoke callback received without signed_request")
            return Response(content="ok", status_code=status.HTTP_200_OK)
        
        # signed_request 파싱
        # 형식: base64url(encoded_signature).base64url(payload)
        parts = signed_request.split('.', 1)
        if len(parts) != 2:
            logger.error("Invalid signed_request format")
            return Response(content="ok", status_code=status.HTTP_200_OK)
        
        encoded_sig, encoded_payload = parts
        
        # base64url 디코딩
        def base64_url_decode(data: str) -> bytes:
            # base64url은 '-'와 '_'를 '+'와 '/'로 변환하고 padding 추가
            data = data.replace('-', '+').replace('_', '/')
            # padding 추가
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
        
        # 서명 검증
        app_secret = settings.meta_app_secret.get_secret_value()
        expected_sig = hmac.new(
            app_secret.encode('utf-8'),
            encoded_payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if not hmac.compare_digest(sig, expected_sig):
            logger.warning("Invalid signature in revoke callback")
            return Response(content="ok", status_code=status.HTTP_200_OK)
        
        # 사용자 ID 추출
        user_id = payload.get('user_id')
        if user_id:
            logger.info(f"Meta revoke callback received for user_id: {user_id}")
            # TODO: 여기서 해당 사용자의 OAuth 계정을 비활성화하거나 삭제하는 로직 추가
            # 예: await oauth_service.revoke_user_access(user_id, db)
        else:
            logger.warning("Meta revoke callback received without user_id")
        
        # Facebook은 200 OK 응답을 기대합니다
        return Response(content="ok", status_code=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error processing Meta revoke callback: {str(e)}")
        logger.error(traceback.format_exc())
        # 에러가 발생해도 200 OK를 반환해야 Facebook이 재시도하지 않습니다
        return Response(content="ok", status_code=status.HTTP_200_OK)


@router.post("/revoke", include_in_schema=False)
async def meta_revoke_simple(request: Request):
    """
    Facebook Deauthorize Callback 엔드포인트 (간단 경로)
    /auth/meta/revoke 경로로도 접근 가능하도록 추가
    /callback/revoke와 동일한 동작
    """
    try:
        form_data = await request.form()
        signed_request = form_data.get("signed_request")
        
        if not signed_request:
            logger.warning("Meta revoke callback received without signed_request")
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
        
        app_secret = settings.meta_app_secret.get_secret_value()
        expected_sig = hmac.new(
            app_secret.encode('utf-8'),
            encoded_payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if not hmac.compare_digest(sig, expected_sig):
            logger.warning("Invalid signature in revoke callback")
            return Response(content="ok", status_code=status.HTTP_200_OK)
        
        user_id = payload.get('user_id')
        if user_id:
            logger.info(f"Meta revoke callback received for user_id: {user_id}")
            # TODO: 여기서 해당 사용자의 OAuth 계정을 비활성화하거나 삭제하는 로직 추가
        
        return Response(content="ok", status_code=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error processing Meta revoke callback: {str(e)}")
        logger.error(traceback.format_exc())
        return Response(content="ok", status_code=status.HTTP_200_OK)


@router.post("/delete", include_in_schema=False)
async def meta_delete(request: Request):
    """
    Facebook Data Deletion Request Callback 엔드포인트 (GDPR)
    사용자가 자신의 데이터 삭제를 요청할 때 Facebook이 호출하는 콜백입니다.
    """
    try:
        form_data = await request.form()
        signed_request = form_data.get("signed_request")
        
        if not signed_request:
            logger.warning("Meta data deletion callback received without signed_request")
            # Facebook Data Deletion은 JSON 형식으로 응답해야 합니다
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        
        # signed_request 파싱 (revoke와 동일)
        parts = signed_request.split('.', 1)
        if len(parts) != 2:
            logger.error("Invalid signed_request format in data deletion")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        
        encoded_sig, encoded_payload = parts
        
        # base64url 디코딩
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
            logger.error(f"Failed to decode signed_request in data deletion: {str(e)}")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        
        # 서명 검증
        app_secret = settings.meta_app_secret.get_secret_value()
        expected_sig = hmac.new(
            app_secret.encode('utf-8'),
            encoded_payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if not hmac.compare_digest(sig, expected_sig):
            logger.warning("Invalid signature in data deletion callback")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        
        # 사용자 ID 추출
        user_id = payload.get('user_id')
        if user_id:
            logger.info(f"Meta data deletion request received for user_id: {user_id}")
            # TODO: 여기서 해당 사용자의 모든 데이터를 삭제하는 로직 추가
            # 예: await oauth_service.delete_user_data(user_id, db)
            
            # Facebook은 삭제 확인 코드를 반환해야 합니다
            # 실제 구현에서는 고유한 확인 코드를 생성하고 저장해야 합니다
            import secrets
            confirmation_code = secrets.token_urlsafe(16)
            # TODO: confirmation_code를 데이터베이스에 저장
            
            # 삭제 상태 확인 URL (선택사항)
            # 사용자가 데이터 삭제 상태를 확인할 수 있는 URL
            deletion_status_url = ""
            
            return Response(
                content=json.dumps({
                    "url": deletion_status_url,
                    "confirmation_code": confirmation_code
                }),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
        else:
            logger.warning("Meta data deletion callback received without user_id")
            return Response(
                content=json.dumps({"url": "", "confirmation_code": ""}),
                media_type="application/json",
                status_code=status.HTTP_200_OK
            )
    
    except Exception as e:
        logger.error(f"Error processing Meta data deletion callback: {str(e)}")
        logger.error(traceback.format_exc())
        return Response(
            content=json.dumps({"url": "", "confirmation_code": ""}),
            media_type="application/json",
            status_code=status.HTTP_200_OK
        )




