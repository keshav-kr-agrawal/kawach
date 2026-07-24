# KAWACH Police Backend — Multi-platform Dockerfile
# Works on: Zoho Catalyst AppSail, Render, Hugging Face Spaces, any Docker host
#
# Zoho Catalyst AppSail: injects X_ZOHO_CATALYST_LISTEN_PORT at runtime.
# Render / HF Spaces: falls back to PORT env var, then 8000.
#
# Required env vars (set in Catalyst Console > AppSail > Environment Variables):
#   DATABASE_URL     = Supabase Postgres connection string
#   GEMINI_API_KEY   = Google AI Studio key (Nayak agent)
#   CLASSIFIER_URL   = https://hikity-kawach-classifier.hf.space
#   JWT_SECRET       = any long random string
#   PYTHONUTF8       = 1
#   PYTHONUNBUFFERED = 1

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Catalyst AppSail uses X_ZOHO_CATALYST_LISTEN_PORT
# Render uses PORT, HF Spaces expects 7860
EXPOSE 8000

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${X_ZOHO_CATALYST_LISTEN_PORT:-${PORT:-8000}}"
