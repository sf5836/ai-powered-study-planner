import os


class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    app_name: str = os.getenv("APP_NAME", "Study Planner AI Service")


settings = Settings()
