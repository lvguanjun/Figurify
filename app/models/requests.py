from pydantic import BaseModel, Field


class GenerateFigureRequest(BaseModel):
    bg_color: str = Field("white", description="背景颜色名称")
    max_cols: int = Field(3, ge=1, le=10, description="每行最大列数")
    base_height: int = Field(600, ge=200, le=2000, description="基础高度")
    padding: int = Field(50, ge=10, le=200, description="间距")
    font_size: int = Field(45, ge=20, le=100, description="字体大小")
    label_style: str = Field("number", description="标签样式")


class SaveImageEditRequest(BaseModel):
    image_id: str
    image_data: str  # Base64 encoded image data


class DeleteImageRequest(BaseModel):
    image_id: str
