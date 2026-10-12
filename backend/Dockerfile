FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn uvicorn psycopg2-binary

# Copy the rest of the application code
COPY . .

# Create a non-root user
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Start server using Gunicorn with a single Uvicorn worker.
# A 512 MB Render instance cannot sustain multiple workers: each
# worker is a full Python process that reloads all libraries
# (~100-150 MB each). One worker saturates the limit safely.
# RENDER_WORKER_INDEX=0 tells the keep-alive task that this is the
# designated ping worker.
CMD sh -c "RENDER_WORKER_INDEX=0 gunicorn main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120 --graceful-timeout 30"
