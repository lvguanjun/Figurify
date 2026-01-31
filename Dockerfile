FROM python:3.10-slim

WORKDIR /app

# 安装必要的系统库 (Pillow 需要)
RUN apt-get update && apt-get install -y \
    libopenjp2-7 \
    libtiff5 \
    libxcb1 \
    fonts-wqy-zenhei \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
