import io
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Optional, Tuple

from PIL import Image, ImageDraw

from app.core.config import settings
from app.utils.font_handler import get_font
from app.utils.image_processor import apply_background


class CombineService:
    @staticmethod
    def _process_single_image(
        item: Tuple[Image.Image, str], bg_color: Tuple[int, int, int], base_height: int
    ) -> Image.Image:
        """
        并行处理单个图片的缩放和背景
        """
        img, filename = item
        # 应用背景
        img = apply_background(img, bg_color)

        # 统一高度
        aspect_ratio = img.width / img.height
        new_w = int(base_height * aspect_ratio)

        # 智能选择缩放算法：对于常规尺寸使用 BICUBIC，对于超大图（出版级）考虑质量优先
        # 实际上 BICUBIC 在绝大多数学术场景已经足够，只有 base_height 非常大时才可能需要 LANCZOS
        filter_type = Image.Resampling.BICUBIC
        if base_height > 1200:
            filter_type = Image.Resampling.LANCZOS

        return img.resize((new_w, base_height), filter_type)

    @staticmethod
    def create_academic_figure(
        image_data_list: List[Tuple[Image.Image, str]],
        output_path: str,
        max_cols: int = 3,
        base_height: int = 600,
        padding: int = 50,
        bg_color: Tuple[int, int, int] = (255, 255, 255),
        show_labels: bool = True,
        label_style: str = "number",  # number, letter, roman, parenthesis
        font_size: int = 45,
    ) -> str:
        """
        创建学术风格的图片拼接
        """
        if not image_data_list:
            raise ValueError("没有图片数据")

        # 1. 并行处理图片尺寸
        # PIL 在 resize 时会释放 GIL，使用 ThreadPoolExecutor 可以利用多核性能
        with ThreadPoolExecutor() as executor:
            processed_images = list(
                executor.map(
                    lambda x: CombineService._process_single_image(
                        x, bg_color, base_height
                    ),
                    image_data_list,
                )
            )

        # 2. 准备字体
        font = get_font(font_size)

        # 3. 计算排版布局
        rows = []
        for i in range(0, len(processed_images), max_cols):
            rows.append(processed_images[i : i + max_cols])

        row_widths = []
        for row in rows:
            w = sum(img.width for img in row) + (len(row) - 1) * padding
            row_widths.append(w)

        canvas_width = max(row_widths) + padding * 2
        text_area_h = int(font_size * 1.5) if show_labels else 0
        row_total_h = base_height + text_area_h + padding
        canvas_height = row_total_h * len(rows) + padding

        # 4. 创建画布
        new_im = Image.new("RGB", (canvas_width, canvas_height), bg_color)
        draw = ImageDraw.Draw(new_im)

        # 5. 绘制
        global_idx = 0
        current_y = padding

        for row in rows:
            # 计算当前行的均匀间距
            row_images_width = sum(img.width for img in row)
            gap = (canvas_width - row_images_width) / (len(row) + 1)

            current_x = gap

            for img in row:
                global_idx += 1

                # 贴图
                new_im.paste(img, (int(current_x), current_y))

                # 写编号
                if show_labels and font:
                    label = CombineService._generate_label(global_idx, label_style)

                    bbox = draw.textbbox((0, 0), label, font=font)
                    text_w = bbox[2] - bbox[0]
                    text_x = int(current_x) + (img.width // 2) - (text_w // 2)
                    text_y = current_y + base_height + 10

                    draw.text(
                        (text_x, text_y),
                        label,
                        fill=(0, 0, 0),
                        font=font,
                    )

                current_x += img.width + gap

            current_y += row_total_h

        # 6. 保存
        new_im.save(output_path, quality=95, dpi=(300, 300))
        return output_path

    @staticmethod
    def _generate_label(idx: int, style: str) -> str:
        """生成标签文本"""
        if style == "letter":
            return chr(ord("a") + idx - 1) if idx <= 26 else str(idx)
        elif style == "roman":
            roman_numerals = [
                "i",
                "ii",
                "iii",
                "iv",
                "v",
                "vi",
                "vii",
                "viii",
                "ix",
                "x",
                "xi",
                "xii",
                "xiii",
                "xiv",
                "xv",
                "xvi",
                "xvii",
                "xviii",
                "xix",
                "xx",
            ]
            return roman_numerals[idx - 1] if idx <= 20 else str(idx)
        elif style == "parenthesis":
            return f"({idx})"
        else:
            return str(idx)
