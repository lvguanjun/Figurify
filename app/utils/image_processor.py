from typing import Optional, Tuple

from PIL import Image


def apply_background(image: Image.Image, bg_color: Tuple[int, int, int]) -> Image.Image:
    """应用背景颜色"""
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, bg_color)
        # 使用 Alpha 通道作为掩码
        if "A" in image.getbands():
            background.paste(image, mask=image.split()[3])
        else:
            background.paste(image)
        return background
    elif image.mode != "RGB":
        return image.convert("RGB")
    return image
