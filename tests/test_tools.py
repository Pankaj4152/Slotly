import pytest
from sloty.schemas.scenario import CalendarEvent
from sloty.tools.calendar_tool import MockCalendar
from sloty.tools.messaging_tool import MockMessaging


def test_calendar_collision_detection():
    existing_event = CalendarEvent(
        id="ev_01",
        title="Sync",
        start="2026-09-09T14:00:00-04:00",
        end="2026-09-09T15:00:00-04:00",
        participants=["sarah"],
        is_confirmed=True,
    )
    calendar = MockCalendar([existing_event])

    # Overlapping request: 14:30 to 15:00
    avail = calendar.check_availability(
        start_iso="2026-09-09T14:30:00-04:00", duration_minutes=30, participants=["sarah"]
    )
    assert avail["available"] is False
    assert avail["conflicting_event_id"] == "ev_01"

    # Non-overlapping request: 15:00 to 15:30
    avail_clear = calendar.check_availability(
        start_iso="2026-09-09T15:00:00-04:00", duration_minutes=30, participants=["sarah"]
    )
    assert avail_clear["available"] is True


def test_messaging_tool_tracking():
    messaging = MockMessaging()
    res = messaging.request_clarification(missing_information="timezone")
    assert res["success"] is True
    assert len(messaging.clarification_requests) == 1
    assert messaging.clarification_requests[0]["missing_information"] == "timezone"
