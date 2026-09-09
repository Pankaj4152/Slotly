from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from sloty.schemas.actions import ActionType


class Role(str, Enum):
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"
    HIRING_MANAGER = "hiring_manager"
    EXECUTIVE = "executive"
    COLLEAGUE = "colleague"


class Participant(BaseModel):
    id: str
    name: str
    role: Role
    timezone: Optional[str] = None
    preferences: List[str] = Field(default_factory=list)


class Message(BaseModel):
    sender: str
    text: str
    timestamp: Optional[str] = None


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str  # ISO 8601 string
    end: str    # ISO 8601 string
    participants: List[str]
    is_confirmed: bool = True


class ExpectedBehavior(BaseModel):
    allowed_actions: List[ActionType] = Field(default_factory=list)
    prohibited_actions: List[ActionType] = Field(default_factory=list)
    required_clarification_topic: Optional[str] = None


class ScenarioSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ScenarioCategory(str, Enum):
    TIMEZONE_AMBIGUITY = "timezone_ambiguity"
    CALENDAR_CONFLICTS = "calendar_conflicts"
    PREFERENCE_CONFLICTS = "preference_conflicts"
    ROLE_PRIORITY = "role_priority"
    TOOL_SAFETY = "tool_safety"


class Scenario(BaseModel):
    id: str
    title: str
    category: ScenarioCategory
    severity: ScenarioSeverity = ScenarioSeverity.MEDIUM
    description: str
    participants: List[Participant]
    conversation: List[Message]
    calendar_state: List[CalendarEvent] = Field(default_factory=list)
    meeting_duration_minutes: int = 30
    expected: ExpectedBehavior
