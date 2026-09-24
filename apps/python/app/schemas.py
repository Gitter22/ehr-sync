from pydantic import BaseModel


class ConnectivityCheckResponse(BaseModel):
    status: str
    database: str
    external_service: str
