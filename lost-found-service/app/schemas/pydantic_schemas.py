from pydantic import BaseModel
from typing import Optional

class LostFoundResponse(BaseModel):
    id: int
    reporterEmail: str
    reporterName: Optional[str] = None
    reporterPhone: Optional[str] = None
    itemName: str
    description: str
    type: str
    priority: str
    locationCategory: str
    locationFloor: str
    matchStatus: str
    matchedWithId: Optional[int] = None
    imageUrl: Optional[str] = None
    aiDescription: Optional[str] = None
    status: Optional[str] = None
    itemStatus: str
    studentType: Optional[str] = None
    createdAt: Optional[str] = None

    class Config:
        from_attributes = True

class LostFoundRequest(BaseModel):
    itemName: str
    description: Optional[str] = None
    type: str
    priority: str
    locationCategory: str
    locationFloor: str

def item_to_response(item) -> dict:
    return item.to_dict()
