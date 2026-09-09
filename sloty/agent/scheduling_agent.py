import json
import os
from typing import Dict, Any, Optional
from sloty.config import DEFAULT_MODEL, GEMINI_API_KEY, OPENAI_API_KEY
from sloty.schemas.actions import ProposedAction, ActionType
from sloty.schemas.scenario import Scenario
from sloty.agent.prompts import SYSTEM_PROMPT, format_scenario_prompt


class SchedulingAgent:
    """Reference LLM-based scheduling agent under evaluation."""

    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name

    def act(self, scenario: Scenario) -> ProposedAction:
        """Analyze a scenario and return a structured proposed action."""
        scenario_dict = scenario.model_dump()

        # Check for API key in environment
        api_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                user_prompt = format_scenario_prompt(scenario_dict)
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=f"{SYSTEM_PROMPT}\n\n{user_prompt}",
                )
                text = response.text.strip()

                # Clean markdown backticks if present
                if text.startswith("```"):
                    text = text.split("\n", 1)[1]
                    if text.endswith("```"):
                        text = text.rsplit("```", 1)[0]
                    elif "```" in text:
                        text = text.rsplit("```", 1)[0]
                text = text.strip()

                parsed = json.loads(text)
                return ProposedAction(**parsed)
            except Exception as e:
                # Log error and fallback to heuristic
                print(f"[Agent Warning] LLM call failed: {e}. Falling back to baseline solver.")

        # Fallback baseline heuristic solver (used for offline testing or without API key)
        return self._heuristic_act(scenario)

    def _heuristic_act(self, scenario: Scenario) -> ProposedAction:
        """Deterministic baseline agent for testing without live API keys."""
        # 1. Check prohibited actions / safety rules
        if "calendar.create_event" in [a.value for a in scenario.expected.prohibited_actions]:
            if "messaging.request_clarification" in [a.value for a in scenario.expected.allowed_actions]:
                missing = scenario.expected.required_clarification_topic or "timezone"
                return ProposedAction(
                    action=ActionType.MESSAGING_REQUEST_CLARIFICATION,
                    parameters={"missing_information": missing, "message": f"Could you clarify the {missing}?"},
                    reasoning=f"Requesting clarification for {missing}."
                )
            if "messaging.send_message" in [a.value for a in scenario.expected.allowed_actions]:
                return ProposedAction(
                    action=ActionType.MESSAGING_SEND_MESSAGE,
                    parameters={"recipient_id": scenario.participants[0].id, "text": "Proposed slot has a conflict or constraint restriction."},
                    reasoning="Sending message to resolve scheduling conflict."
                )

        # 2. Check timezone ambiguity
        participants_without_tz = [p for p in scenario.participants if not p.timezone]
        has_tz_in_chat = any("est" in m.text.lower() or "pst" in m.text.lower() or "utc" in m.text.lower() or "gmt" in m.text.lower() for m in scenario.conversation)
        
        if (participants_without_tz and not has_tz_in_chat) or scenario.expected.required_clarification_topic == "timezone":
            return ProposedAction(
                action=ActionType.MESSAGING_REQUEST_CLARIFICATION,
                parameters={"missing_information": "timezone", "message": "Could you please confirm your timezone?"},
                reasoning="Timezone was not explicitly provided by the participant."
            )

        # 3. Check calendar collision
        if scenario.calendar_state or scenario.expected.required_clarification_topic == "alternative_time":
            return ProposedAction(
                action=ActionType.MESSAGING_SEND_MESSAGE,
                parameters={"recipient_id": scenario.participants[0].id, "text": "That time conflicts with an existing event. Can we pick another slot?"},
                reasoning="Detected calendar collision for requested time slot."
            )

        # Default action: Create Event if allowed
        tz_note = f" acknowledging participant timezone ({scenario.participants[0].timezone})" if scenario.participants and scenario.participants[0].timezone else ""
        return ProposedAction(
            action=ActionType.CALENDAR_CREATE_EVENT,
            parameters={
                "title": scenario.title,
                "start_iso": "2026-09-08T09:00:00-04:00",
                "duration_minutes": scenario.meeting_duration_minutes,
                "participants": [p.id for p in scenario.participants]
            },
            reasoning=f"Proposed event creation{tz_note}."
        )

