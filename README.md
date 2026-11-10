# cooperative

PWA для гаражно-будівельного кооперативу на Cloudflare Workers. Опис проєкту і план: [docs/PROJECT.md](docs/PROJECT.md).

## Локальний запуск

```bash
npm install
npm run dev
```

## Розгортання

Автоматично: у Cloudflare Dashboard → Workers & Pages → Create → Import a repository → `vm-cpu/cooperative`.
Кожен push у `main` розгортається автоматично.

Вручну:

```bash
npm run deploy
```
