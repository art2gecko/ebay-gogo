import base64
import logging
import time
import httpx
from config import config

logger = logging.getLogger(__name__)


class EbayAuth:
    """Handles eBay OAuth 2.0 authentication."""

    def __init__(self):
        self._app_token: str | None = None
        self._app_token_expires_at: float = 0

    def _get_basic_auth_header(self) -> str:
        credentials = f"{config.EBAY_CLIENT_ID}:{config.EBAY_CLIENT_SECRET}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    async def get_app_token(self) -> str:
        """Get an application access token (client credentials grant).

        Used for Browse API calls that don't require user context.
        Tokens are cached and auto-refreshed when expired.
        """
        if self._app_token and time.time() < self._app_token_expires_at:
            return self._app_token

        token_url = f"{config.ebay_api_base}/identity/v1/oauth2/token"
        logger.info(f"Requesting app token from: {token_url}")
        logger.info(f"Using Client ID: {config.EBAY_CLIENT_ID[:20]}...")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_url,
                    headers={
                        "Authorization": self._get_basic_auth_header(),
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data={
                        "grant_type": "client_credentials",
                        "scope": "https://api.ebay.com/oauth/api_scope",
                    },
                )

                if response.status_code != 200:
                    logger.error(
                        f"Token request failed: {response.status_code} - {response.text}"
                    )
                    response.raise_for_status()

                data = response.json()
        except httpx.ProxyError as e:
            logger.error(f"Proxy error connecting to eBay: {e}")
            raise ConnectionError(
                f"Cannot reach eBay API ({token_url}). "
                "Check your network/proxy settings."
            ) from e
        except httpx.ConnectError as e:
            logger.error(f"Connection error to eBay: {e}")
            raise ConnectionError(
                f"Cannot connect to eBay API ({token_url}). "
                "Check your internet connection."
            ) from e

        self._app_token = data["access_token"]
        # Refresh 5 minutes before actual expiry
        self._app_token_expires_at = time.time() + data["expires_in"] - 300
        logger.info("Successfully obtained eBay app token")
        return self._app_token

    def get_auth_url(self, redirect_uri: str, state: str = "") -> str:
        """Generate the eBay OAuth authorization URL for user consent.

        Used if we later need user-level access tokens.
        """
        scopes = "https://api.ebay.com/oauth/api_scope/buy.order"
        return (
            f"{config.ebay_auth_base}/oauth2/authorize"
            f"?client_id={config.EBAY_CLIENT_ID}"
            f"&redirect_uri={redirect_uri}"
            f"&response_type=code"
            f"&scope={scopes}"
            f"&state={state}"
        )

    async def exchange_code_for_token(
        self, code: str, redirect_uri: str
    ) -> dict:
        """Exchange an authorization code for a user access token."""
        token_url = f"{config.ebay_api_base}/identity/v1/oauth2/token"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                headers={
                    "Authorization": self._get_basic_auth_header(),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            response.raise_for_status()
            return response.json()


# Singleton
ebay_auth = EbayAuth()
