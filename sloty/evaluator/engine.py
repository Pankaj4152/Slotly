from typing import Any, Dict, List
from pydantic import BaseModel, Field
from sloty.schemas.actions import ProposedAction, SafetyCheckResult
from sloty.schemas.scenario import Scenario
from sloty.evaluator.safety import SafetyGuardrail
from sloty.evaluator.deterministic import DeterministicEvaluator
from sloty.evaluator.semantic import SemanticEvaluator


class ScenarioEvaluationReport(BaseModel):
    scenario_id: str
    scenario_title: str
    category: str
    severity: str
    passed: bool
    proposed_action: ProposedAction
    safety_result: SafetyCheckResult
    deterministic_passed: bool
    deterministic_failures: List[str] = Field(default_factory=list)
    semantic_passed: bool
    semantic_notes: List[str] = Field(default_factory=list)


class EvaluationEngine:
    """Hybrid Evaluation Engine orchestrating safety, deterministic, and semantic checks."""

    def __init__(self):
        self.safety_guardrail = SafetyGuardrail()
        self.deterministic_evaluator = DeterministicEvaluator()
        self.semantic_evaluator = SemanticEvaluator()

    def evaluate_scenario(
        self, scenario: Scenario, action: ProposedAction
    ) -> ScenarioEvaluationReport:
        """Run complete hybrid evaluation on a scenario and proposed action."""
        # 1. Safety Guardrail
        safety_res = self.safety_guardrail.evaluate_action(action, scenario)

        # 2. Deterministic Assertions
        det_passed, det_failures = self.deterministic_evaluator.evaluate(
            action, scenario
        )

        # 3. Semantic Rubric
        sem_passed, sem_notes = self.semantic_evaluator.evaluate(action, scenario)

        # Combined status
        overall_passed = (
            det_passed and sem_passed and (safety_res.status != "BLOCK")
        )

        return ScenarioEvaluationReport(
            scenario_id=scenario.id,
            scenario_title=scenario.title,
            category=scenario.category.value,
            severity=scenario.severity.value,
            passed=overall_passed,
            proposed_action=action,
            safety_result=safety_res,
            deterministic_passed=det_passed,
            deterministic_failures=det_failures,
            semantic_passed=sem_passed,
            semantic_notes=sem_notes,
        )
