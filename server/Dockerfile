# Build from the repository root so the seed corpus is included:
#   docker build -f server/Dockerfile -t katha-server .
#   docker run -p 8000:8000 -v katha-data:/data katha-server
FROM python:3.12-slim

WORKDIR /srv
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server/app ./app
COPY content ./content

ENV KATHA_CONTENT=/srv/content/lessons.json \
    KATHA_DB=/data/katha.db
VOLUME /data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
