import json
from pathlib import Path
from sloty.schemas.scenario import Scenario
from sloty.agent.scheduling_agent import SchedulingAgent
from sloty.schemas.actions import ActionType


def test_agent_timezone_ambiguity_heuristic():
    scenario_path = Path(__file__).parent.parent / "scenarios" / "timezone_001.json"
    with open(scenario_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    scenario = Scenario(**data)
    agent = SchedulingAgent()
    action = agent.act(scenario)

    assert action.action == ActionType.MESSAGING_REQUEST_CLARIFICATION
    assert action.parameters.get("missing_information") == "timezone"
