# cooperative

Проєкт на Cloudflare Workers (статичні файли з `public/` + API у `src/index.js`).

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
