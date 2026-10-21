class ProviderError(Exception):
    """Base error for an external routing/weather provider."""


class ProviderNotConfigured(ProviderError):
    """The provider key or base URL is missing."""


class ProviderRateLimited(ProviderError):
    """The provider returned a rate-limit response."""


class NoRouteFound(ProviderError):
    """No road route could be found for the requested locations."""
