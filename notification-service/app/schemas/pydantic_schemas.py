from pydantic import BaseModel
from typing import Optional

class NotificationResponse(BaseModel):
    id: int
    recipientEmail: str
    title: str
    message: str
    type: str
    relatedItemId: Optional[int] = None
    read: bool
    createdAt: Optional[str] = None

    class Config:
        from_attributes = True

def notification_to_response(n) -> dict:
    return n.to_dict()
