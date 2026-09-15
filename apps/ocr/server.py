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
    # Uma única passada, na imagem já normalizada/realçada para OCR. Antes rodava o
    # PaddleOCR duas vezes (nessa imagem e na original em resolução cheia) e mesclava
    # as linhas — em fotos reais de comprovante (muito texto pequeno) isso dobra o
    # tempo de processamento e estourava o timeout da API em produção.
    result = ocr.ocr(image, cls=True)
    lines: list[str] = []
    for page in result or []:
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
    longest = max(width, height, 1)
    # Normaliza tanto imagens pequenas (upscale até 1800px ajuda o detector) quanto
    # fotos de celular muito grandes (downscale: acima disso só adiciona tempo de
    # processamento sem ganho de leitura).
    scale = 1800 / longest
    if abs(scale - 1) > 0.01:
        source = source.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)
    enhanced = ImageOps.autocontrast(source)
    enhanced = ImageEnhance.Contrast(enhanced).enhance(1.25)
    enhanced = ImageEnhance.Sharpness(enhanced).enhance(1.5)
    enhanced = enhanced.filter(ImageFilter.UnsharpMask(radius=1, percent=110, threshold=3))
    return np.asarray(enhanced)