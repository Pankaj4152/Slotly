from typing import Dict, List, Optional


class MockMessaging:
    """In-memory simulated messaging tool for agent output tracking."""

    def __init__(self):
        self.sent_messages: List[Dict[str, str]] = []
        self.clarification_requests: List[Dict[str, str]] = []

    def request_clarification(
        self, missing_information: str, message: Optional[str] = None
    ) -> Dict[str, str]:
        """Record an agent's request for clarification from participants."""
        record = {
            "missing_information": missing_information,
            "message": message or f"Could you please clarify the {missing_information}?",
        }
        self.clarification_requests.append(record)
        return {"success": True, "action": "request_clarification", **record}

    def send_message(self, recipient_id: str, text: str) -> Dict[str, str]:
        """Record an outbound message from the agent."""
        record = {"recipient_id": recipient_id, "text": text}
        self.sent_messages.append(record)
        return {"success": True, "action": "send_message", **record}
