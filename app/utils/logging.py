import logging
import sys
from typing import Optional

from app.config import get_settings

settings = get_settings()


import json

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "time": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage()
        }
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_record, ensure_ascii=False)

def configure_logging() -> None:
    """Configure application logging."""
    log_level = logging.DEBUG
    
    logging.basicConfig(
        level=log_level,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('app_debug.log'),
        ],
    )
    # Add proper JSON formatter to all handlers
    for handler in logging.getLogger().handlers:
        handler.setFormatter(JsonFormatter())



def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name or __name__)






