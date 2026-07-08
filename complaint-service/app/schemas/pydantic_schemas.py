from pydantic import BaseModel
from typing import Optional

class ComplaintResponse(BaseModel):
    id: int
    studentEmail: str
    studentName: Optional[str] = None
    roomNumber: Optional[str] = None
    title: str
    description: str
    category: Optional[str] = None
    status: str
    imagePath: Optional[str] = None
    timeOfDay: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    resolvedAt: Optional[str] = None
    resolvedByWorker: Optional[str] = None
    workerNote: Optional[str] = None
    workType: Optional[str] = None
    assignedWorkerEmail: Optional[str] = None
    assignedWorkerName: Optional[str] = None

    class Config:
        from_attributes = True

class ResolveRequest(BaseModel):
    workerNote: Optional[str] = ''

class AssignUnassignedRequest(BaseModel):
    workType: str
    workerEmail: str

def complaint_to_response(complaint) -> dict:
    return complaint.to_dict()
