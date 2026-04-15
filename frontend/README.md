# Frontend - Medico INC (Next.js)

Frontend organizado no padrao dos projetos principais:

- `app/`: rotas Next.js
- `components/`: componentes reutilizaveis
- `hooks/`: hooks customizados
- `lib/`: configuracoes e utilitarios
- `services/`: integracoes HTTP
- `stores/`: estado global
- `types/`: tipagens
- `public/`: assets e paginas estaticas da landing (`index.html`, `checkout.html`, etc.)
- `scripts/`: automacoes de frontend

## Como roda

1. `cd frontend`
2. `npm install`
3. `npm run dev`

Rotas:

- `/` -> redireciona para `/index.html`
- `/checkout` -> redireciona para `/checkout.html`
- `/politica-de-privacidade` -> redireciona para `/politica-de-privacidade.html`

## Marca

Configuracao principal em `lib/brand-config.ts`.
