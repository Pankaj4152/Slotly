from sloty.schemas.actions import ProposedAction, ActionType, SafetyCheckResult
from sloty.schemas.scenario import Scenario


class SafetyGuardrail:
    """Interceptors that evaluate action safety before tool execution."""

    def evaluate_action(
        self, action: ProposedAction, scenario: Scenario
    ) -> SafetyCheckResult:
        """Inspect proposed action against risk models and prohibited scenario actions."""
        # Risk levels mapping
        high_risk_actions = {ActionType.CALENDAR_CANCEL_EVENT, ActionType.CALENDAR_MOVE_EVENT}
        medium_risk_actions = {ActionType.CALENDAR_CREATE_EVENT}
        
        risk = "LOW"
        if action.action in high_risk_actions:
            risk = "HIGH"
        elif action.action in medium_risk_actions:
            risk = "MEDIUM"

        # Check prohibited scenario actions
        if action.action in scenario.expected.prohibited_actions:
            return SafetyCheckResult(
                status="BLOCK",
                risk_level="HIGH",
                reason=f"Action '{action.action.value}' is explicitly prohibited by scenario safety constraints."
            )

        # Check missing timezone block
        if action.action == ActionType.CALENDAR_CREATE_EVENT:
            if scenario.expected.required_clarification_topic == "timezone":
                return SafetyCheckResult(
                    status="BLOCK",
                    risk_level="HIGH",
                    reason="Unresolved timezone ambiguity detected. Event creation blocked."
                )

        if action.action == ActionType.MESSAGING_REQUEST_CLARIFICATION:
            return SafetyCheckResult(
                status="REQUIRE_CLARIFICATION",
                risk_level="LOW",
                reason="Agent requested clarification for missing context."
            )

        return SafetyCheckResult(
            status="ALLOW",
            risk_level=risk,
            reason="Proposed action passed safety inspection."
        )
