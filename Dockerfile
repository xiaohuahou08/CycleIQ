FROM python:3.12-slim

WORKDIR /app

# Install all pinned backend dependencies first
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install the cycleiq library
COPY cycleiq/ ./cycleiq/
COPY setup.py .
RUN pip install --no-cache-dir -e .

COPY backend/ ./backend/

EXPOSE 5000
ENV PORT=5000

CMD ["sh", "-c", "cd /app/backend && alembic upgrade heads && cd /app && gunicorn --bind 0.0.0.0:5000 backend.wsgi:app"]
