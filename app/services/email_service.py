
import smtplib
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

    def _send_sync(self, to_email: str, subject: str, html_content: str):
        if not self.smtp_user or not self.smtp_password:
            logger.warning("⚠️ SMTP credentials not found. Email will NOT be sent.")
            logger.warning(f"📧 [Dummy Email] To: {to_email} | Subject: {subject}")
            logger.warning(f"🔗 Content: {html_content}")
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = self.sender_email
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(html_content, "html"))

            if self.smtp_port == 465:
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port) as server:
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
            
            logger.info(f"✅ Email sent successfully to {to_email}")
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {e}")

    async def send_verification_email(self, to_email: str, token: str):
        """
        Sends a magic link verification email.
        Designed to be run as a BackgroundTask to avoid blocking the API.
        """
        base_url = self.frontend_base_url.rstrip('/')
        verification_link = f"{base_url}/verify-email?token={token}&email={to_email}"
        
        subject = "🔐 [AIDM] 이메일 인증을 완료해주세요"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0095f6;">AIDM 가입을 환영합니다! 🎉</h2>
                    <p>안녕하세요,</p>
                    <p>서비스 이용을 위해 아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_link}" style="background-color: #0095f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">이메일 인증하기</a>
                    </div>
                    <p style="font-size: 12px; color: #888;">
                        버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
                        <a href="{verification_link}" style="color: #0095f6;">{verification_link}</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #aaa;">본 메일은 발신 전용입니다.</p>
                </div>
            </body>
        </html>
        """
        
        # Synchronous SMTP call (should be run in background task wrapper usually, 
        # or we execute it directly here if using a thread pool, but for simplicity we call logic directly 
        # assuming the caller will wrap it in BackgroundTasks or run_in_executor)
        # For Python FastAPI, simple 'def' creates a thread, but here we defined 'async def'.
        # To not block async loop with synchronous smtplib, we run in executor.
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._send_sync, to_email, subject, html_content)

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
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._send_sync, to_email, subject, html_content)
