# cooperative

PWA для гаражно-будівельного кооперативу на Cloudflare Workers.

- [Опис проєкту](docs/PROJECT.md)
- [Покроковий план](docs/PLAN.md)
- [Безпечне середовище розробки](docs/SETUP.md)
- [Правила для AI-асистентів](AGENTS.md)

## Локальний запуск

```bash
npm install -g npm@11   # один раз
npm install
npm run dev
npm run check   # lint + формат + тести + збірка, перед кожним PR
```

## Розгортання

Автоматично: у Cloudflare Dashboard → Workers & Pages → Create → Import a repository → `vm-cpu/cooperative`.
Кожен push у `main` розгортається автоматично.

Вручну:

```bash
npm run deploy
```
