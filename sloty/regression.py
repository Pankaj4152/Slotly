import json
from pathlib import Path
from typing import Any, Dict, List
from pydantic import BaseModel, Field


class RunSummary(BaseModel):
    run_id: str
    timestamp: str
    total_scenarios: int
    passed_count: int
    failed_count: int
    accuracy_percentage: float
    results: List[Dict[str, Any]]


class RegressionReport(BaseModel):
    previous_run_id: str
    current_run_id: str
    regressions: List[Dict[str, str]] = Field(default_factory=list)  # PASS -> FAIL
    fixes: List[Dict[str, str]] = Field(default_factory=list)        # FAIL -> PASS
    unchanged_failures: List[str] = Field(default_factory=list)
    has_regressions: bool = False


class RegressionEngine:
    """Engine for comparing evaluation benchmark runs to detect regressions."""

    @staticmethod
    def compare_runs(
        previous_run: RunSummary, current_run: RunSummary
    ) -> RegressionReport:
        """Compare two evaluation runs and return a structured regression report."""
        prev_map = {r["scenario_id"]: r["passed"] for r in previous_run.results}
        curr_map = {r["scenario_id"]: r["passed"] for r in current_run.results}

        regressions = []
        fixes = []
        unchanged_failures = []

        for scenario_id, curr_passed in curr_map.items():
            prev_passed = prev_map.get(scenario_id)
            if prev_passed is True and curr_passed is False:
                regressions.append(
                    {
                        "scenario_id": scenario_id,
                        "change": "PASS -> FAIL",
                        "severity": "HIGH",
                    }
                )
            elif prev_passed is False and curr_passed is True:
                fixes.append(
                    {"scenario_id": scenario_id, "change": "FAIL -> PASS"}
                )
            elif prev_passed is False and curr_passed is False:
                unchanged_failures.append(scenario_id)

        return RegressionReport(
            previous_run_id=previous_run.run_id,
            current_run_id=current_run.run_id,
            regressions=regressions,
            fixes=fixes,
            unchanged_failures=unchanged_failures,
            has_regressions=len(regressions) > 0,
        )
