# --- Base image ---
FROM python:3.12-slim

# Prevents Python from writing .pyc files and buffers stdout (so logs show up immediately)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps needed by some packages (e.g. sentence-transformers/onnxruntime).
# Uncomment the extra lines if you later enable the ML requirements (torch/opencv).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (before copying app code) so Docker can
# cache this layer - it won't reinstall packages every time you change a .py file.
COPY requirements.txt .

# Install CPU-only PyTorch FIRST. sentence-transformers depends on torch, and
# without this, pip defaults to the GPU/CUDA build on Linux - which pulls in
# several gigabytes of NVIDIA libraries that are useless without a GPU-enabled
# container anyway. Installing the CPU wheel here means requirements.txt's
# later `pip install` sees torch already satisfied and skips re-downloading it.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# Now copy the actual application code
COPY . .

# Create the uploads directory so StaticFiles doesn't crash on a fresh container
RUN mkdir -p uploads chroma_data

EXPOSE 8000

# Basic healthcheck so `docker ps` / orchestrators can tell if the app is alive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]