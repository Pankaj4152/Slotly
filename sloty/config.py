import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SCENARIOS_DIR = BASE_DIR / "scenarios"
RUNS_DIR = BASE_DIR / "runs"

# Ensure directories exist
SCENARIOS_DIR.mkdir(parents=True, exist_ok=True)
RUNS_DIR.mkdir(parents=True, exist_ok=True)

# LLM Configuration
DEFAULT_MODEL = os.getenv("SLOTY_MODEL", "gemini-3.1-flash-lite")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
