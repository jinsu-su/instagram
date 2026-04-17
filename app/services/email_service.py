import smtplib
import boto3
from sqlalchemy.ext.asyncio import AsyncSession
from botocore.exceptions import ClientError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class EmailService:
    def __init__(self):
        settings = get_settings()
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password.get_secret_value() if settings.smtp_password else None
        self.sender_email = settings.smtp_sender or self.smtp_user
        self.frontend_base_url = str(settings.frontend_base_url)
        
        # AWS SES Configuration
        self.use_ses = settings.use_ses
        self.aws_region = settings.aws_region
        self.aws_access_key_id = settings.aws_access_key_id.get_secret_value() if settings.aws_access_key_id else None
        self.aws_secret_access_key = settings.aws_secret_access_key.get_secret_value() if settings.aws_secret_access_key else None
        
        self._ses_client = None

    @property
    def ses_client(self):
        """Lazy-loaded SES client with protection against IMDS hangs."""
        if not self.use_ses:
            return None
            
        if self._ses_client is None:
            try:
                from botocore.config import Config
                # Disable IMDS metadata service to avoid 30s-60s hangs on non-AWS environments
                config = Config(
                    region_name=self.aws_region,
                    retries={'max_attempts': 1},
                    connect_timeout=5,
                    read_timeout=5
                )
                
                self._ses_client = boto3.client(
                    'ses',
                    region_name=self.aws_region,
                    aws_access_key_id=self.aws_access_key_id,
                    aws_secret_access_key=self.aws_secret_access_key,
                    config=config
                )
                logger.info("🚀 AWS SES client initialized lazily.")
            except Exception as e:
                logger.error(f"❌ Failed to initialize AWS SES client: {e}")
                self.use_ses = False # Disable SES for this instance if init fails
                
        return self._ses_client

    def _send_via_smtp(self, to_email: str, subject: str, html_content: str):
        """Sends an email using standard SMTP (fallback)."""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(html_content, 'html'))

            server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
            server.quit()
            logger.info(f"✅ Email sent via SMTP fallback to {to_email}")
        except Exception as e:
            logger.error(f"❌ SMTP Error sending to {to_email}: {e}")

    def _send_via_ses(self, to_email: str, subject: str, html_content: str):
        """Sends an email using AWS SES."""
        try:
            response = self.ses_client.send_email(
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Body': {
                        'Html': {'Charset': "UTF-8", 'Data': html_content},
                    },
                    'Subject': {'Charset': "UTF-8", 'Data': subject},
                },
                Source=self.sender_email,
            )
            logger.info(f"✅ Email sent via SES to {to_email}. MessageID: {response['MessageId']}")
        except ClientError as e:
            logger.error(f"❌ AWS SES Error sending to {to_email}: {e.response['Error']['Message']}")
            # Optional: try falling back to SMTP even on SES error? 
            # For now, we trust SES but if it fails we might want to try SMTP as a last resort.
            if self.smtp_user and self.smtp_password:
                logger.info("🔄 Attempting SMTP fallback after SES failure...")
                self._send_via_smtp(to_email, subject, html_content)
        except Exception as e:
            logger.error(f"❌ Unexpected error sending via SES to {to_email}: {e}")

    async def _is_blocked(self, email: str, db: AsyncSession) -> bool:
        """Checks if an email is blocked in the database."""
        from sqlalchemy import select
        from app.models.customer import Customer
        
        result = await db.execute(select(Customer).where(Customer.email == email))
        customer = result.scalar_one_or_none()
        
        if customer and customer.is_email_blocked:
            logger.warning(f"🚫 Skipping email to {email}: Address is blocked ({customer.email_block_reason})")
            return True
        return False

    async def _send_sync_wrapper(self, to_email: str, subject: str, html_content: str):
        """
        Wrapper to handle the sync sending logic with database checks.
        """
        from app.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            if await self._is_blocked(to_email, db):
                return
            
            import asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._send_sync, to_email, subject, html_content)

    def _send_sync(self, to_email: str, subject: str, html_content: str):
        """Dispatches email sending to either SES or SMTP."""
        # 1. Try SES if enabled
        if self.use_ses and self.ses_client:
            return self._send_via_ses(to_email, subject, html_content)
            
        # 2. Try SMTP if credentials provided
        if self.smtp_user and self.smtp_password:
            return self._send_via_smtp(to_email, subject, html_content)

        # 3. Local Development Fallback (Log only)
        logger.warning(f"📝 [Email Mock] Sending to {to_email} | Subject: {subject}")
        logger.debug(f"Content: {html_content[:100]}...")

    async def send_verification_email(self, to_email: str, token: str):
        """
        Sends a magic link verification email.
        Designed to be run as a BackgroundTask to avoid blocking the API.
        """
        base_url = self.frontend_base_url.rstrip('/')
        verification_link = f"{base_url}/verify-email?token={token}&email={to_email}"
        
        subject = "🔐 [AIDM] 계정 활성화를 위해 메일을 확인해주세요."
        html_content = f"""
        <html>
            <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; padding: 40px; background-color: white; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 30px;">
                         <h1 style="color: #000; font-size: 24px; font-weight: 900; letter-spacing: -1px;">AIDM</h1>
                    </div>
                    
                    <h2 style="font-size: 20px; font-weight: 800; color: #111; margin-bottom: 20px; text-align: center;">반갑습니다! 👋</h2>
                    
                    <p style="font-size: 15px; color: #444; margin-bottom: 30px; text-align: center; font-weight: 500;">
                        AIDM 가입을 완료하기 위해 이메일 인증이 필요합니다.<br>
                        아래 버튼을 클릭하시면 즉시 로그인이 가능하며,<br>
                        인스타그램 자동 응답 설정을 바로 시작하실 수 있습니다.
                    </p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="{verification_link}" style="background-color: #000; color: white; padding: 18px 32px; text-decoration: none; border-radius: 16px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">이메일 인증 및 시작하기</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #888; text-align: center; background-color: #f8f9fa; padding: 15px; border-radius: 12px;">
                        버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
                        <a href="{verification_link}" style="color: #0095f6; word-break: break-all;">{verification_link}</a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="font-size: 11px; color: #ccc; text-align: center;">본 메일은 발신 전용이며 회신되지 않습니다.</p>
                </div>
            </body>
        </html>
        """
        
        # Synchronous SMTP call (should be run in background task wrapper usually, 
        # or we execute it directly here if using a thread pool, but for simplicity we call logic directly 
        # assuming the caller will wrap it in BackgroundTasks or run_in_executor)
        # For Python FastAPI, simple 'def' creates a thread, but here we defined 'async def'.
        # To not block async loop with synchronous smtplib, we run in executor.
        await self._send_sync_wrapper(to_email, subject, html_content)

    async def send_password_reset_email(self, to_email: str, token: str):
        """
        Sends a password reset link.
        """
        base_url = self.frontend_base_url.rstrip('/')
        reset_link = f"{base_url}/reset-password?token={token}"
        
        subject = "🔑 [AIDM] 비밀번호 재설정 요청"
        html_content = f"""
        <html>
            <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; padding: 40px; background-color: white; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 30px;">
                         <h1 style="color: #000; font-size: 24px; font-weight: 900; letter-spacing: -1px;">AIDM</h1>
                    </div>
                    
                    <h2 style="font-size: 20px; font-weight: 800; color: #111; margin-bottom: 20px; text-align: center;">비밀번호 재설정 안내</h2>
                    
                    <p style="font-size: 14px; color: #555; margin-bottom: 30px; text-align: center;">
                        안녕하세요. AIDM 계정의 비밀번호 재설정 요청을 받았습니다.<br>
                        본인이 요청하신 것이 아니라면 이 메일을 무시하셔도 됩니다.
                    </p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="{reset_link}" style="background-color: #000; color: white; padding: 18px 32px; text-decoration: none; border-radius: 16px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">비밀번호 재설정하기</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #999; text-align: center;">
                        이 링크는 보안을 위해 1시간 동안만 유효합니다.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 30px 0;">
                    
                    <p style="font-size: 11px; color: #ccc; text-align: center;">본 메일은 발신 전용이며 회신되지 않습니다.</p>
                </div>
            </body>
        </html>
        """
        await self._send_sync_wrapper(to_email, subject, html_content)
