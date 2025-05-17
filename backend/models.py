from pydantic import BaseModel
from typing import Optional

class TripInfo(BaseModel):
    title: Optional[str] = None
    requirements: Optional[str] = None
    names: Optional[list[str]] = None
    destination: Optional[str] = None
    duration: Optional[str] = None
    dates: Optional[str] = None
    budget: Optional[str] = None
