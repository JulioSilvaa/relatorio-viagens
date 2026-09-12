FROM python:3.11-slim

WORKDIR /app

ENV PIP_NO_CACHE_DIR=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
		&& apt-get install -y --no-install-recommends \
			libgomp1 \
			libgl1 \
			libglib2.0-0 \
			libsm6 \
			libxext6 \
			libxrender1 \
			libzbar0 \
			libxcb1 \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY server.py ./server.py

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]