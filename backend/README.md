# Backend - Seu Site Medico (White Label)

Backend de checkout white label com arquitetura em camadas:

- `src/core`: configuracao, seguranca e observabilidade
- `src/domain`: entidades e contratos de negocio
- `src/application`: casos de uso
- `src/infrastructure`: gateways e persistencia
- `src/presentation`: rotas HTTP

## Endpoints

- `GET /health`
- `POST /api/checkout/enterprise` (Mercado Pago)
- `POST /api/checkout/stripe` (Stripe)
- `POST /api/checkout/save-draft`
- `GET /api/checkout/status?order_id=...`

## Rodar local

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/start_server.py
```

Servidor padrao: `http://127.0.0.1:8787`
