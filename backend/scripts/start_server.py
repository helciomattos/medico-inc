from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.core.config import get_settings


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.app_port, reload=True)


if __name__ == "__main__":
    main()
