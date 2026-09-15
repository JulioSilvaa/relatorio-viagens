from io import BytesIO

from fastapi import FastAPI, File, UploadFile
import numpy as np
from PIL import Image
from PIL import ImageEnhance, ImageOps, ImageFilter
from paddleocr import PaddleOCR
from pyzbar.pyzbar import decode

app = FastAPI(title="VDR OCR")
ocr = PaddleOCR(use_angle_cls=True, lang="pt", show_log=False)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ocr")
async def extract(file: UploadFile = File(...)) -> dict[str, object]:
    source = ImageOps.exif_transpose(Image.open(BytesIO(await file.read()))).convert("RGB")
    image = enhance_for_ocr(source)
    result = ocr.ocr(image, cls=True)
    original_result = ocr.ocr(np.asarray(source), cls=True)
    lines: list[str] = []
    for extraction in (original_result, result):
        for page in extraction or []:
            for item in page or []:
                if len(item) > 1 and item[1]:
                    value = str(item[1][0]).strip()
                    if value and value not in lines:
                        lines.append(value)
    barcodes = [item.data.decode("utf-8", errors="ignore") for item in decode(np.asarray(source))]
    return {
        "text": "\n".join(lines),
        "barcodes": barcodes,
        "lines": str(len(lines)),
    }


def enhance_for_ocr(source: Image.Image) -> np.ndarray:
    width, height = source.size
    scale = min(2.0, 1800 / max(width, 1)) if width < 1800 else 1.0
    if scale > 1:
        source = source.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)
    enhanced = ImageOps.autocontrast(source)
    enhanced = ImageEnhance.Contrast(enhanced).enhance(1.25)
    enhanced = ImageEnhance.Sharpness(enhanced).enhance(1.5)
    enhanced = enhanced.filter(ImageFilter.UnsharpMask(radius=1, percent=110, threshold=3))
    return np.asarray(enhanced)