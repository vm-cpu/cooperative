# cooperative

PWA для гаражно-будівельного кооперативу на Cloudflare Workers.

- [Опис проєкту](docs/PROJECT.md)
- [Покроковий план](docs/PLAN.md)
- [Безпечне середовище розробки](docs/SETUP.md)
- [Робота з Git: гілки, коміти, відкат](docs/GIT-WORKFLOW.md)
- [Правила для AI-асистентів](AGENTS.md)

## Локальний запуск

```bash
npm install -g npm@11   # один раз
npm install
npm run dev
npm run check   # lint + формат + тести + збірка, перед кожним PR
```

## Середовища

- [Staging — тестування](https://cooperative-staging.vm-55d.workers.dev)
- [Production — робоче середовище](https://cooperative.vm-55d.workers.dev)
- [Розгортання, доступ і відкат](docs/ENVIRONMENTS.md)
- [Перша ітерація: завдання Володі](docs/ITERATION-1.md)

Обидва середовища закриті Cloudflare Access. Поки це стартові сторінки без реєстру та персональних даних.
GitHub/Cloudflare Builds перевіряють код; production публікується окремою явною командою.
