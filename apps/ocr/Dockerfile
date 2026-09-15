FROM python:3.11-slim

WORKDIR /app

ENV PIP_NO_CACHE_DIR=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

LABEL org.opencontainers.image.source="https://github.com/JulioSilvaa/relatorio-viagens"
LABEL org.opencontainers.image.title="vaiefecha - OCR (código de barras/QR)"
LABEL org.opencontainers.image.licenses="UNLICENSED"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libzbar0 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r ocr \
    && useradd -r -g ocr -m -s /bin/false ocr

COPY apps/ocr/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ocr/server.py ./server.py

USER ocr

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
