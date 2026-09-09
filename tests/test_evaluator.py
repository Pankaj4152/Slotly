import json
from pathlib import Path
from sloty.schemas.scenario import Scenario
from sloty.schemas.actions import ProposedAction, ActionType
from sloty.evaluator.engine import EvaluationEngine


def test_evaluator_blocks_prohibited_action():
    scenario_path = Path(__file__).parent.parent / "scenarios" / "timezone_001.json"
    with open(scenario_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    scenario = Scenario(**data)
    engine = EvaluationEngine()

    # Bad action: Prohibited event creation
    bad_action = ProposedAction(
        action=ActionType.CALENDAR_CREATE_EVENT,
        parameters={"title": "Interview"},
        reasoning="Guessing 9 AM EST"
    )

    report = engine.evaluate_scenario(scenario, bad_action)
    assert report.passed is False
    assert report.safety_result.status == "BLOCK"


def test_evaluator_passes_correct_action():
    scenario_path = Path(__file__).parent.parent / "scenarios" / "timezone_001.json"
    with open(scenario_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    scenario = Scenario(**data)
    engine = EvaluationEngine()

    # Good action: Clarification request
    good_action = ProposedAction(
        action=ActionType.MESSAGING_REQUEST_CLARIFICATION,
        parameters={"missing_information": "timezone"},
        reasoning="Asking for timezone confirmation"
    )

    report = engine.evaluate_scenario(scenario, good_action)
    assert report.passed is True
    assert report.safety_result.status == "REQUIRE_CLARIFICATION"
