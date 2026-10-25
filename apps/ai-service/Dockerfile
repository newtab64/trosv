# ============================================================
# TROSV ai-service - Python 3.12, Debian 13 "trixie" (khop convention
# Debian cua cac image khac trong stack).
# ============================================================
FROM python:3.12-slim-trixie

ARG INSTALL_DEV="false"

WORKDIR /app

COPY requirements.txt requirements-dev.txt* ./
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_DEV" = "true" ] && [ -f requirements-dev.txt ]; then \
        pip install --no-cache-dir -r requirements-dev.txt; \
    fi

COPY . .

EXPOSE 8001

# Khoi lenh that do compose gan (uvicorn ...); CMD giu cho chay doc lap.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

