from typing import Dict, Optional, Tuple

# 预定义背景颜色
BACKGROUND_COLORS: Dict[str, Optional[Tuple[int, int, int]]] = {
    "white": (255, 255, 255),
    "light_gray": (245, 245, 245),
    "cream": (255, 253, 248),
    "light_blue": (240, 248, 255),
    "light_green": (245, 255, 250),
    "transparent": None,  # 用于 PNG
}
