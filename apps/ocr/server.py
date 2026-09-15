from io import BytesIO

from fastapi import FastAPI, File, UploadFile
import numpy as np
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
from rapidocr import RapidOCR
from pyzbar.pyzbar import decode

app = FastAPI(title="VDR OCR")

# RapidOCR (ONNX Runtime) no lugar do PaddleOCR: mesmos modelos PP-OCR por trás,
# porém rodando num runtime de inferência bem mais leve e rápido em CPU — é o que
# resolve os timeouts que o PaddleOCR-em-Docker vinha dando em fotos reais.
# "Rec.lang_type": "pt" seleciona o modelo de reconhecimento com português
# (confirmado via inspeção do pacote instalado: PP-OCRv6 lista "pt" entre os
# idiomas suportados nos modelos tiny/small/medium — não existe "latin" genérico
# aqui). model_root_dir fixo evita depender do cache default (dentro do
# site-packages) e é o caminho montado como volume persistente no Docker.
ocr = RapidOCR(
    params={
        "Global.model_root_dir": "/home/ocr/.rapidocr/models",
        "Rec.lang_type": "pt",
    }
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ocr")
async def extract(file: UploadFile = File(...)) -> dict[str, object]:
    source = ImageOps.exif_transpose(Image.open(BytesIO(await file.read()))).convert("RGB")
    image = enhance_for_ocr(source)
    result = ocr(image)

    lines: list[str] = []
    scores: list[float] = []
    for text, score in zip(result.txts or (), result.scores or ()):
        value = str(text).strip()
        if value and value not in lines:
            lines.append(value)
            scores.append(float(score))

    barcodes = [item.data.decode("utf-8", errors="ignore") for item in decode(np.asarray(source))]
    confidence = sum(scores) / len(scores) if scores else 0.0
    # result.elapse já é o tempo real medido pelo próprio RapidOCR (det+cls+rec),
    # em segundos — mais preciso que medir na mão em volta da chamada.
    processing_ms = int(result.elapse * 1000)

    return {
        "text": "\n".join(lines),
        "barcodes": barcodes,
        "lines": str(len(lines)),
        "confidence": round(confidence, 4),
        "processingMs": processing_ms,
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
