from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    CALENDAR_CHECK_AVAILABILITY = "calendar.check_availability"
    CALENDAR_CREATE_EVENT = "calendar.create_event"
    CALENDAR_MOVE_EVENT = "calendar.move_event"
    CALENDAR_CANCEL_EVENT = "calendar.cancel_event"
    MESSAGING_SEND_MESSAGE = "messaging.send_message"
    MESSAGING_REQUEST_CLARIFICATION = "messaging.request_clarification"


class ProposedAction(BaseModel):
    """Structured action emitted by an autonomous scheduling agent."""

    action: ActionType = Field(
        ..., description="The specific tool action selected by the agent"
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters passed to the selected tool action",
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="Short chain-of-thought explanation for choosing this action",
    )


class SafetyCheckResult(BaseModel):
    """Outcome of evaluating a proposed action through the safety guardrail layer."""

    status: str = Field(
        ..., description="Safety decision: ALLOW, BLOCK, or REQUIRE_CLARIFICATION"
    )
    risk_level: str = Field(..., description="Action risk: LOW, MEDIUM, HIGH")
    reason: str = Field(
        ..., description="Detailed explanation of the safety decision"
    )
