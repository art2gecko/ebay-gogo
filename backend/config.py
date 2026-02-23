import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
_project_root = Path(__file__).resolve().parent.parent
_env_path = _project_root / ".env"
load_dotenv(_env_path)


class Config:
    # eBay API credentials
    EBAY_APP_ID: str = os.getenv("EBAY_APP_ID", "")
    EBAY_CERT_ID: str = os.getenv("EBAY_CERT_ID", "")
    EBAY_DEV_ID: str = os.getenv("EBAY_DEV_ID", "")
    EBAY_CLIENT_ID: str = os.getenv("EBAY_CLIENT_ID", "")
    EBAY_CLIENT_SECRET: str = os.getenv("EBAY_CLIENT_SECRET", "")

    # eBay environment
    EBAY_ENVIRONMENT: str = os.getenv("EBAY_ENVIRONMENT", "SANDBOX").upper()

    @property
    def ebay_api_base(self) -> str:
        if self.EBAY_ENVIRONMENT == "PRODUCTION":
            return "https://api.ebay.com"
        return "https://api.sandbox.ebay.com"

    @property
    def ebay_auth_base(self) -> str:
        if self.EBAY_ENVIRONMENT == "PRODUCTION":
            return "https://auth.ebay.com"
        return "https://auth.sandbox.ebay.com"

    # Telegram notifications
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # Server
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8888"))

    # Database
    DB_PATH: str = str(_project_root / "ebay_gogo.db")

    # Monitoring defaults
    DEFAULT_POLL_INTERVAL: int = 30  # seconds
    MIN_POLL_INTERVAL: int = 15
    MAX_DAILY_API_CALLS: int = 5000


config = Config()
