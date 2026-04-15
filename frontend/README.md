# Frontend - Estrutura White Label

Estrutura inspirada em projeto de producao, preparada para evoluir o frontend com separacao por modulos.

Pastas:

- `app/`: paginas e rotas
- `components/`: componentes reutilizaveis
- `hooks/`: hooks customizados
- `lib/`: utilitarios e configuracoes
- `services/`: integracoes HTTP
- `stores/`: estado global
- `types/`: tipagens
- `public/`: assets estaticos
- `scripts/`: automacoes de frontend

## Estado atual

A landing em producao continua nos arquivos raiz do projeto para deploy rapido:

- `index.html`
- `checkout.html`
- `style.css`
- `checkout.css`
- `script.js`
- `checkout.js`

## White label

Esta estrutura esta pronta para migrar para framework (ex: Next.js) sem carregar dados de outros produtos.
A configuracao de marca fica centralizada em `lib/brand-config.ts`.
