from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "学术图片拼接工具"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # 基础目录
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    FRONTEND_DIR: Path = BASE_DIR / "static"
    UPLOAD_DIR: Path = BASE_DIR / "tmp" / "image_combiner" / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "tmp" / "image_combiner" / "outputs"

    # CORS 配置
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(case_sensitive=True)


settings = Settings()

# 确保目录存在
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
