from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sloty.schemas.scenario import CalendarEvent


class MockCalendar:
    """In-memory simulated calendar tool for scheduling evaluation."""

    def __init__(self, initial_events: Optional[List[CalendarEvent]] = None):
        self.events: Dict[str, CalendarEvent] = {}
        if initial_events:
            for event in initial_events:
                self.events[event.id] = event

    @staticmethod
    def _parse_iso(timestamp_str: str) -> datetime:
        """Parse ISO 8601 string to Python datetime."""
        return datetime.fromisoformat(timestamp_str)

    def has_collision(
        self,
        start_iso: str,
        duration_minutes: int,
        participants: List[str],
        ignore_event_id: Optional[str] = None,
    ) -> Optional[CalendarEvent]:
        """Check if proposed start time overlaps with existing confirmed events for participants."""
        try:
            start_dt = self._parse_iso(start_iso)
            end_dt = start_dt + timedelta(minutes=duration_minutes)
        except (ValueError, TypeError):
            # Invalid date format is handled as collision/validation error
            return None

        for event in self.events.values():
            if not event.is_confirmed:
                continue
            if ignore_event_id and event.id == ignore_event_id:
                continue

            # Check if any participant overlaps
            if any(p in event.participants for p in participants):
                ev_start = self._parse_iso(event.start)
                ev_end = self._parse_iso(event.end)

                # Overlap condition: start < ev_end AND end > ev_start
                if start_dt < ev_end and end_dt > ev_start:
                    return event

        return None

    def check_availability(
        self, start_iso: str, duration_minutes: int, participants: List[str]
    ) -> Dict[str, bool]:
        """Check availability for specified participants at given start time."""
        collision = self.has_collision(start_iso, duration_minutes, participants)
        return {
            "available": collision is None,
            "conflicting_event_id": collision.id if collision else None,
        }

    def create_event(
        self, title: str, start_iso: str, duration_minutes: int, participants: List[str]
    ) -> Dict[str, str]:
        """Simulate creating a calendar event."""
        collision = self.has_collision(start_iso, duration_minutes, participants)
        if collision:
            return {
                "success": False,
                "reason": f"Collision with event '{collision.title}' (ID: {collision.id})",
            }

        start_dt = self._parse_iso(start_iso)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        event_id = f"event_{len(self.events) + 1:03d}"

        new_event = CalendarEvent(
            id=event_id,
            title=title,
            start=start_dt.isoformat(),
            end=end_dt.isoformat(),
            participants=participants,
            is_confirmed=True,
        )
        self.events[event_id] = new_event
        return {"success": True, "event_id": event_id}
