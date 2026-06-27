FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies for OpenCV
# Note: libgl1-mesa-glx was removed in Debian Trixie, replaced by libgl1
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    wget \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up non-root user (UID 1000 required by Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy requirements first for Docker layer caching
COPY --chown=user requirements.txt .

# Install PyTorch CPU-only first (HF free tier is CPU-only)
RUN pip install --no-cache-dir --user -U pip && \
    pip install --no-cache-dir --user torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install rest of dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy app code
COPY --chown=user . .

# Download weights during build so startup is instant
RUN python download_weights.py

# Hugging Face Spaces required port
EXPOSE 7860

# Run the FastAPI microservice
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
