from io import BytesIO

from fastapi import FastAPI, File, UploadFile
import numpy as np
from PIL import Image, ImageOps
from pyzbar.pyzbar import decode

app = FastAPI(title="VDR OCR")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/barcode")
async def barcode(file: UploadFile = File(...)) -> dict[str, object]:
    source = ImageOps.exif_transpose(Image.open(BytesIO(await file.read()))).convert("RGB")
    barcodes = [item.data.decode("utf-8", errors="ignore") for item in decode(np.asarray(source))]
    return {"barcodes": barcodes}
