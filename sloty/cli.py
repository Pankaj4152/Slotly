import json
import time
from pathlib import Path
from typing import Optional
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from sloty.config import SCENARIOS_DIR, RUNS_DIR
from sloty.schemas.scenario import Scenario
from sloty.agent.scheduling_agent import SchedulingAgent
from sloty.evaluator.engine import EvaluationEngine
from sloty.regression import RunSummary, RegressionEngine

app = typer.Typer(help="Sloty: Adversarial Evaluation & Regression Testing CLI")
console = Console()


@app.command()
def run(
    category: Optional[str] = typer.Option(None, help="Filter scenarios by category"),
    scenario: Optional[str] = typer.Option(None, help="Run a specific scenario ID"),
):
    """Run adversarial evaluation benchmarks against the scheduling agent."""
    console.print("\n[bold blue]=== Starting Sloty Evaluation Run ===[/bold blue]\n")

    scenario_files = list(SCENARIOS_DIR.glob("*.json"))
    if not scenario_files:
        console.print("[yellow]No scenario JSON files found in scenarios/[/yellow]")
        raise typer.Exit()

    scenarios = []
    for sf in scenario_files:
        try:
            with open(sf, "r", encoding="utf-8") as f:
                data = json.load(f)
                sc = Scenario(**data)
                if scenario and sc.id != scenario:
                    continue
                if category and sc.category.value != category:
                    continue
                scenarios.append(sc)
        except Exception as e:
            console.print(f"[red]Error parsing scenario file {sf.name}: {e}[/red]")

    if not scenarios:
        console.print("[yellow]No matching scenarios found for criteria.[/yellow]")
        raise typer.Exit()

    agent = SchedulingAgent()
    engine = EvaluationEngine()

    reports = []
    passed_count = 0

    for sc in scenarios:
        action = agent.act(sc)
        report = engine.evaluate_scenario(sc, action)
        reports.append(report)

        if report.passed:
            passed_count += 1
            console.print(f"  [green][PASS][/green] [{sc.severity.value.upper()}] {sc.id}: {sc.title}")
        else:
            console.print(f"  [red][FAIL][/red] [{sc.severity.value.upper()}] {sc.id}: {sc.title}")
            for fail_msg in report.deterministic_failures:
                console.print(f"     [dim red]|-- {fail_msg}[/dim red]")


    accuracy = (passed_count / len(scenarios)) * 100 if scenarios else 0

    run_id = f"run_{int(time.time())}"
    summary = RunSummary(
        run_id=run_id,
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
        total_scenarios=len(scenarios),
        passed_count=passed_count,
        failed_count=len(scenarios) - passed_count,
        accuracy_percentage=round(accuracy, 1),
        results=[r.model_dump() for r in reports],
    )

    # Save run JSON
    run_file = RUNS_DIR / f"{run_id}.json"
    with open(run_file, "w", encoding="utf-8") as f:
        json.dump(summary.model_dump(), f, indent=2)

    # Display Summary Table
    table = Table(title=f"Evaluation Run Summary ({run_id})")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="magenta")

    table.add_row("Total Scenarios", str(len(scenarios)))
    table.add_row("Passed", str(passed_count))
    table.add_row("Failed", str(len(scenarios) - passed_count))
    table.add_row("Accuracy Rate", f"{accuracy:.1f}%")

    console.print("\n")
    console.print(table)
    console.print(f"\n[dim]Run artifact saved to: {run_file}[/dim]\n")


@app.command()
def compare(run_a: str, run_b: str):
    """Compare two benchmark runs to detect behavioral regressions."""
    file_a = RUNS_DIR / f"{run_a}.json" if not run_a.endswith(".json") else Path(run_a)
    file_b = RUNS_DIR / f"{run_b}.json" if not run_b.endswith(".json") else Path(run_b)

    if not file_a.exists() or not file_b.exists():
        console.print("[red]One or both run files do not exist.[/red]")
        raise typer.Exit()

    with open(file_a, "r", encoding="utf-8") as f:
        summary_a = RunSummary(**json.load(f))
    with open(file_b, "r", encoding="utf-8") as f:
        summary_b = RunSummary(**json.load(f))

    report = RegressionEngine.compare_runs(summary_a, summary_b)

    console.print(f"\n[bold blue]=== Sloty Regression Comparison ===[/bold blue]")
    console.print(f"Comparing [cyan]{run_a}[/cyan] --> [cyan]{run_b}[/cyan]\n")

    if report.has_regressions:
        console.print("[bold red]! REGRESSIONS DETECTED ![/bold red]")
        for reg in report.regressions:
            console.print(f"  [red][FAIL] {reg['scenario_id']}[/red]: {reg['change']}")
    else:
        console.print("[bold green][PASS] NO REGRESSIONS DETECTED![/bold green]")

    if report.fixes:
        console.print("\n[bold green]FIXED SCENARIOS:[/bold green]")
        for fix in report.fixes:
            console.print(f"  [green][FIXED] {fix['scenario_id']}[/green]: {fix['change']}")
    console.print("\n")



def main():
    app()


if __name__ == "__main__":
    main()
