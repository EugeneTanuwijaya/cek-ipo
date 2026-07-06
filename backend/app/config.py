from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_path: str = "data/ipo.db"
    admin_token: str = "change-me"

settings = Settings()
