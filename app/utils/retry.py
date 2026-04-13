import asyncio
import functools
import time
import logging
from typing import Callable, Any, Coroutine

logger = logging.getLogger(__name__)

def async_retry(max_attempts: int = 3, initial_delay: float = 0.5, backoff_factor: float = 2.0, exceptions: tuple = (Exception,)) -> Callable[[Callable[..., Coroutine[Any, Any, Any]]], Callable[..., Coroutine[Any, Any, Any]]]:
    """Asynchronous retry decorator with exponential backoff.

    Parameters
    ----------
    max_attempts: int
        Maximum number of attempts (including the first try).
    initial_delay: float
        Initial delay in seconds before the first retry.
    backoff_factor: float
        Multiplier applied to the delay after each failed attempt.
    exceptions: tuple
        Exception types that trigger a retry.
    """
    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]) -> Callable[..., Coroutine[Any, Any, Any]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            attempt = 0
            while True:
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    attempt += 1
                    if attempt >= max_attempts:
                        logger.error(f"Retry exhausted for {func.__name__}: {e}")
                        raise
                    logger.warning(f"Retry {attempt}/{max_attempts} for {func.__name__} after {delay}s due to {e}")
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
        return wrapper
    return decorator
