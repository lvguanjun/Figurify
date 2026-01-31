import base64
import io
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image

from app.constants.colors import BACKGROUND_COLORS
from app.core.config import settings
from app.models.responses import GenerateFigureResponse
from app.services.combine_service import CombineService

router = APIRouter()


@router.post("/generateFigure", response_model=GenerateFigureResponse)
async def generate_figure(
    images: List[UploadFile] = File(...),
    bg_color: str = Form("white"),
    max_cols: int = Form(3),
    base_height: int = Form(600),
    padding: int = Form(50),
    font_size: int = Form(45),
    label_style: str = Form("number"),
):
    """
    生成拼接图 RPC 接口
    """
    try:
        # 1. 读取上传的图片
        image_data_list = []
        for upload_file in images:
            content = await upload_file.read()
            img = Image.open(io.BytesIO(content))
            image_data_list.append((img, upload_file.filename))

        if not image_data_list:
            raise HTTPException(status_code=400, detail="没有上传图片")

        # 2. 获取背景颜色
        bg = BACKGROUND_COLORS.get(bg_color, (255, 255, 255))
        if bg is None:
            bg = (255, 255, 255)

        # 3. 生成输出文件名
        output_filename = f"combined_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"
        output_path = settings.OUTPUT_DIR / output_filename

        # 4. 调用服务层生成拼接图
        CombineService.create_academic_figure(
            image_data_list=image_data_list,
            output_path=str(output_path),
            max_cols=max_cols,
            base_height=base_height,
            padding=padding,
            bg_color=bg,
            show_labels=(label_style != "none"),
            label_style=label_style,
            font_size=font_size,
        )

        return GenerateFigureResponse(
            success=True,
            preview_url=f"/api/v1/getOutputPreview?filename={output_filename}",
            download_url=f"/api/v1/getDownloadLink?filename={output_filename}",
            filename=output_filename,
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/getOutputPreview")
async def get_output_preview(filename: str):
    """获取输出预览 (直接返回图片)"""
    file_path = settings.OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(file_path, media_type="image/jpeg")


@router.get("/getDownloadLink")
async def get_download_link(filename: str):
    """获取下载链接 (直接返回文件)"""
    file_path = settings.OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(
        file_path, media_type="image/jpeg", filename=f"academic_figure_{filename}"
    )


@router.post("/uploadImages")
async def upload_images(images: List[UploadFile] = File(...)):
    """上传图片 (RPC 风格)"""
    # 这里可以实现服务器端存储逻辑，目前前端主要是转 dataUrl
    # 但为了符合 RPC 规范，我们提供此接口
    return JSONResponse(
        {
            "success": True,
            "count": len(images),
            "message": "Images uploaded successfully",
        }
    )


@router.post("/saveImageEdit")
async def save_image_edit(image_id: str = Form(...), image_data: str = Form(...)):
    """保存图片编辑 (RPC 风格)"""
    # 实际上由于是无状态的，前端可以自己处理，
    # 但如果要在后端持久化，可以在这里实现
    return JSONResponse({"success": True, "image_id": image_id})


@router.post("/deleteImage")
async def delete_image(image_id: str = Form(...)):
    """删除图片 (RPC 风格)"""
    return JSONResponse({"success": True, "image_id": image_id})


@router.post("/convertTiffToPng")
async def convert_tiff_to_png(image: UploadFile = File(...)):
    """
    将 TIFF 格式转换为 PNG 并返回 base64 dataUrl
    """
    try:
        # 1. 读取上传的 TIFF 文件
        content = await image.read()
        tiff_image = Image.open(io.BytesIO(content))

        # 2. 转换为 RGBA 模式（支持透明度）
        if tiff_image.mode not in ("RGB", "RGBA"):
            tiff_image = tiff_image.convert("RGBA")

        # 3. 转换为 PNG 格式的 bytes
        png_buffer = io.BytesIO()
        tiff_image.save(png_buffer, format="PNG")
        png_bytes = png_buffer.getvalue()

        # 4. 转换为 base64 dataUrl
        base64_data = base64.b64encode(png_bytes).decode("utf-8")
        data_url = f"data:image/png;base64,{base64_data}"

        return JSONResponse(
            {
                "success": True,
                "dataUrl": data_url,
                "message": "TIFF converted to PNG successfully",
            }
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TIFF 转换失败: {str(e)}")
