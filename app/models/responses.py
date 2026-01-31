from typing import List, Optional

from pydantic import BaseModel


class GenerateFigureResponse(BaseModel):
    success: bool
    preview_url: str
    download_url: str
    filename: str


class UploadImagesResponse(BaseModel):
    success: bool
    uploaded_ids: List[str]
    count: int


class GenericResponse(BaseModel):
    success: bool
    message: Optional[str] = None
