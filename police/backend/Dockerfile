# KAWACH Police Backend — Hugging Face Spaces (Docker SDK) / any container host.
# HF Spaces serves on fixed port 7860. Deploy as its OWN Space (separate from
# the Classifier Space — different dependency stack, independent restarts).
#
# Required Space secrets (Settings → Variables and secrets):
#   DATABASE_URL     = Supabase Postgres connection string (Settings → Database)
#   GEMINI_API_KEY   = Google AI Studio key (Nayak agent)
#   CLASSIFIER_URL   = https://hikity-kawach-classifier.hf.space
#   JWT_SECRET       = any long random string

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
