# White Label - Estrutura Replicada

Este projeto foi organizado no modelo frontend/backend para manter a mesma logica arquitetural de um projeto de producao, sem reaproveitar dados, textos privados ou identidade de outro produto.

## Estrutura criada

- `frontend/`
  - `app/`
  - `components/`
  - `hooks/`
  - `lib/`
  - `services/`
  - `stores/`
  - `types/`
  - `public/`

- `backend/`
  - `src/core/`
  - `src/domain/`
  - `src/application/`
  - `src/infrastructure/`
  - `src/presentation/api_v1/`
  - `api/index.py`
  - `scripts/start_server.py`

## Principios aplicados

1. White label completo: apenas estrutura e padroes tecnicos.
2. Zero dados herdados: nenhuma base de clientes, pedidos ou conteudo operacional externo.
3. Gateways mantidos no checkout: Mercado Pago e Stripe.
4. Frontend da landing mantido funcional para subida rapida na raiz do projeto.

## Integracao atual

- Frontend publico (landing): `index.html` e `checkout.html` na raiz.
- Backend de checkout: `http://127.0.0.1:8787`.
- O `checkout.js` resolve automaticamente endpoint local quando rodando em `localhost/127.0.0.1`.
