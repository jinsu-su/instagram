import asyncio
import time
from typing import Dict, Optional
from app.utils.logging import get_logger

logger = get_logger(__name__)

class RateLimiterService:
    """
    SaaS Robustness: In-memory Rate Limiter to protect Instagram accounts from being blocked.
    Limits DM sending and comment replies per account (Page ID).
    """
    def __init__(self, calls_per_minute: int = 15, burst_limit: int = 5):
        self.calls_per_minute = calls_per_minute
        self.burst_limit = burst_limit
        self.interval = 60.0 / calls_per_minute
        # account_id -> [timestamp1, timestamp2, ...]
        self.account_history: Dict[str, list] = {}
        self._lock = asyncio.Lock()

    async def wait_for_slot(self, account_id: str):
        """
        Blocks until a slot is available for the given account.
        """
        async with self._lock:
            if account_id not in self.account_history:
                self.account_history[account_id] = []
            
            history = self.account_history[account_id]
            now = time.time()
            
            # 1. Clean up old history
            self.account_history[account_id] = [t for t in history if now - t < 60]
            history = self.account_history[account_id]
            
            # 2. Check Burst Limit (Spaced out calls)
            if history:
                time_since_last = now - history[-1]
                if time_since_last < self.interval:
                    wait_time = self.interval - time_since_last
                    logger.debug(f"⏳ Rate limiting account {account_id}: waiting {wait_time:.2f}s for spacing.")
                    await asyncio.sleep(wait_time)
                    now = time.time() # Update now after sleep

            # 3. Check Minute Limit
            if len(history) >= self.calls_per_minute:
                wait_time = 60 - (now - history[0])
                if wait_time > 0:
                    logger.warning(f"⚠️ High volume on account {account_id}: waiting {wait_time:.2f}s for minute slot.")
                    await asyncio.sleep(wait_time)
                    now = time.time()
            
            # Add current call to history
            self.account_history[account_id].append(now)
            logger.debug(f"✅ Slot acquired for account {account_id}. History size: {len(self.account_history[account_id])}")

# Global instance
rate_limiter = RateLimiterService(calls_per_minute=20, burst_limit=5)
