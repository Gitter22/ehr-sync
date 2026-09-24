import httpx

from app.config import settings


async def check_external_service() -> bool:
    """Ping a public external service to prove outbound HTTP connectivity.

    Stands in for the future HAPI FHIR / Oracle sandbox calls.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(settings.external_health_url)
            return response.status_code < 500
    except httpx.HTTPError:
        return False
