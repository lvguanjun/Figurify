from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1 import combine
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含 API 路由
app.include_router(combine.router, prefix=settings.API_V1_STR)

# 静态资源访问
app.mount("/outputs", StaticFiles(directory=settings.OUTPUT_DIR), name="outputs")

# 前端静态资源 (挂载在最后，作为兜底)
app.mount("/", StaticFiles(directory=settings.FRONTEND_DIR, html=True), name="frontend")


@app.get("/download/{filename}")
async def download_output(filename: str):
    """下载输出图片"""
    file_path = settings.OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(
        file_path, media_type="image/jpeg", filename=f"academic_figure_{filename}"
    )


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
