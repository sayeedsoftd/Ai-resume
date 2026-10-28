from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import NotificationType


class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.SYSTEM


class NotificationCreate(NotificationBase):
    user_id: Optional[int] = None  # None indicates broadcast to all


class NotificationResponse(NotificationBase):
    id: int
    user_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
