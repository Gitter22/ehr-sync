from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    database_url: str
    python_port: int = 8000
    external_health_url: str = "https://hapi.fhir.org/baseR4/metadata"


settings = Settings()  # type: ignore[call-arg]
