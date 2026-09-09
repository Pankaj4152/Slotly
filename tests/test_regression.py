from sloty.regression import RunSummary, RegressionEngine


def test_regression_detection():
    run1 = RunSummary(
        run_id="run_001",
        timestamp="2026-09-09 10:00:00",
        total_scenarios=2,
        passed_count=2,
        failed_count=0,
        accuracy_percentage=100.0,
        results=[
            {"scenario_id": "tz_01", "passed": True},
            {"scenario_id": "conf_01", "passed": True},
        ],
    )

    run2 = RunSummary(
        run_id="run_002",
        timestamp="2026-09-09 11:00:00",
        total_scenarios=2,
        passed_count=1,
        failed_count=1,
        accuracy_percentage=50.0,
        results=[
            {"scenario_id": "tz_01", "passed": False},  # Regression
            {"scenario_id": "conf_01", "passed": True},
        ],
    )

    report = RegressionEngine.compare_runs(run1, run2)
    assert report.has_regressions is True
    assert len(report.regressions) == 1
    assert report.regressions[0]["scenario_id"] == "tz_01"
