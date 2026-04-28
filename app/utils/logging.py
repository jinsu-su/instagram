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

from logging.handlers import RotatingFileHandler

def configure_logging() -> None:
    """Configure application logging for production cloud environments."""
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    
    # Cloud Run/GCE/GKE standard is stdout/stderr
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)
        
    root_logger.addHandler(handler)
    
    # Optionally mute noisy loggers
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)



def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name or __name__)






