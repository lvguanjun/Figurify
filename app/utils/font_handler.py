import os
from pathlib import Path
from typing import Optional

from PIL import ImageFont


def get_font(font_size: int = 45) -> Optional[ImageFont.FreeTypeFont]:
    """获取可用字体"""
    possible_paths = [
        # 宋体字体（优先）
        "/usr/share/fonts/truetype/arphic/uming.ttc",  # AR PL UMing (明体)
        "/usr/share/fonts/truetype/noto-cjk/NotoSerifCJK-Regular.ttc",  # Noto Serif CJK
        "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
        # 其他中文字体（非粗体）
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        # 西文字体（常规，非Bold）
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]

    for path in possible_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, font_size)
            except Exception:
                continue

    # 使用默认字体
    try:
        return ImageFont.load_default()
    except Exception:
        return None
