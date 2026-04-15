# Quick Start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/start_server.py
```

Teste rapido:

```bash
curl -X POST http://127.0.0.1:8787/api/checkout/enterprise \
  -H 'Content-Type: application/json' \
  -d '{"amount":497,"payment_method":"credit_card","customer":{"name":"Dr Teste","email":"dr@teste.com"}}'
```
