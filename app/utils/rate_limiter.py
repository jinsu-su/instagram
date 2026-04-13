"""간단한 인메모리 레이트 리미터.

- 목적: 새로고침/리렌더 등으로 동일 엔드포인트가 과도 호출될 때 서버 리소스/외부 API/AI 비용 보호
- 특징: 프로세스 인메모리(단일 Uvicorn 워커 기준). 멀티워커/멀티인스턴스면 Redis 등으로 확장 필요.
"""

from __future__ import annotations

from dataclasses import dataclass
from collections import defaultdict, deque
from typing import Deque, DefaultDict, Tuple
import asyncio
import time


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after_seconds: float


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        # key -> window_seconds -> deque[timestamps]
        self._events: DefaultDict[str, DefaultDict[int, Deque[float]]] = defaultdict(lambda: defaultdict(deque))

    async def allow(self, key: str, max_calls: int, window_seconds: int) -> RateLimitResult:
        """슬라이딩 윈도우 방식으로 호출 허용 여부를 반환."""
        now = time.monotonic()
        cutoff = now - float(window_seconds)

        async with self._lock:
            q = self._events[key][window_seconds]

            # 오래된 이벤트 제거
            while q and q[0] <= cutoff:
                q.popleft()

            if len(q) >= max_calls:
                oldest = q[0]
                retry_after = (oldest + float(window_seconds)) - now
                if retry_after < 0:
                    retry_after = 0.0
                return RateLimitResult(allowed=False, retry_after_seconds=retry_after)

            q.append(now)
            return RateLimitResult(allowed=True, retry_after_seconds=0.0)


rate_limiter = InMemoryRateLimiter()
