
import asyncio
from sqlalchemy import text
from app.database import engine
from app.utils.logging import get_logger

logger = get_logger(__name__)

async def run_manual_migration():
    commands = [
        "ALTER TABLE customer ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;",
        "CREATE INDEX IF NOT EXISTS idx_automation_activity_customer_id ON automation_activity(customer_id);",
        "CREATE INDEX IF NOT EXISTS idx_automation_activity_event_type ON automation_activity(event_type);",
        "CREATE INDEX IF NOT EXISTS idx_automation_activity_status ON automation_activity(status);",
        "CREATE INDEX IF NOT EXISTS idx_automation_activity_created_at ON automation_activity(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_campaigns_customer_id ON campaigns(customer_id);",
        "CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);",
        "CREATE INDEX IF NOT EXISTS idx_contact_customer_id ON contact(customer_id);"
    ]
    
    async with engine.begin() as conn:
        for cmd in commands:
            try:
                logger.info(f"Running: {cmd}")
                await conn.execute(text(cmd))
            except Exception as e:
                logger.error(f"Error running command {cmd}: {e}")
    
    logger.info("Manual migration completed.")

if __name__ == "__main__":
    asyncio.run(run_manual_migration())
