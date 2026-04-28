from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.models.base import Base

class SchedulerLock(Base):
    __tablename__ = "scheduler_locks"

    task_name = Column(String, primary_key=True)
    last_run_at = Column(DateTime, default=datetime.utcnow)
    worker_id = Column(String) # To track which worker/instance ran it
