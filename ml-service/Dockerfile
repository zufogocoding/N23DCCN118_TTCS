FROM python:3.11-slim

WORKDIR /app

# Cài đặt các thư viện cần thiết cho C++ core của implicit
RUN apt-get update && apt-get install -y gcc g++ libopenblas-dev

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
