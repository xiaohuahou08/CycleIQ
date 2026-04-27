FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY cycleiq/ ./cycleiq/
COPY setup.py .
RUN pip install --no-cache-dir -e .

COPY backend/ ./backend/

EXPOSE 5000
ENV PORT=5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "backend.app:app"]
