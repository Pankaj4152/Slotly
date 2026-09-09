from typing import List, Tuple
from sloty.schemas.actions import ProposedAction
from sloty.schemas.scenario import Scenario


class DeterministicEvaluator:
    """Python-based hard assertion checks for agent proposed actions."""

    def evaluate(
        self, action: ProposedAction, scenario: Scenario
    ) -> Tuple[bool, List[str]]:
        """Run deterministic assertion checks against expected behavior."""
        failures = []

        # Check 1: Prohibited Action Check
        if action.action in scenario.expected.prohibited_actions:
            failures.append(
                f"Prohibited Action: Agent executed '{action.action.value}' which is prohibited."
            )

        # Check 2: Allowed Action Check (if specified)
        if (
            scenario.expected.allowed_actions
            and action.action not in scenario.expected.allowed_actions
        ):
            failures.append(
                f"Invalid Action Choice: Agent executed '{action.action.value}', expected one of {[a.value for a in scenario.expected.allowed_actions]}"
            )

        # Check 3: Required Clarification Check
        if scenario.expected.required_clarification_topic:
            if action.action != "messaging.request_clarification" and action.action != "messaging.send_message":
                failures.append(
                    f"Ambiguity Failure: Expected clarification request for '{scenario.expected.required_clarification_topic}', got '{action.action.value}'"
                )

        passed = len(failures) == 0
        return passed, failures
