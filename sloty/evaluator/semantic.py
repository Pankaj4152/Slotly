from typing import List, Tuple
from sloty.schemas.actions import ProposedAction
from sloty.schemas.scenario import Scenario


class SemanticEvaluator:
    """Semantic rubric evaluator assessing context understanding and reasoning quality."""

    def evaluate(
        self, action: ProposedAction, scenario: Scenario
    ) -> Tuple[bool, List[str]]:
        """Assess semantic reasoning quality against scenario context."""
        notes = []
        passed = True

        reasoning = (action.reasoning or "").lower()

        # Check if agent provided reasoning
        if not reasoning:
            notes.append("Semantic Warning: Agent provided no chain-of-thought reasoning.")

        # Specific context check for timezone scenarios
        if scenario.category == "timezone_ambiguity":
            if "timezone" in reasoning or "tz" in reasoning or action.action == "messaging.request_clarification":
                notes.append("Semantic Pass: Recognized timezone context correctly.")
            else:
                passed = False
                notes.append("Semantic Failure: Agent failed to acknowledge timezone context in reasoning.")

        return passed, notes
