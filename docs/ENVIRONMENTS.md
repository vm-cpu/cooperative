# Staging і production

|                | Staging                                        | Production                                          |
| -------------- | ---------------------------------------------- | --------------------------------------------------- |
| Адреса         | https://cooperative-staging.vm-55d.workers.dev | https://cooperative.vm-55d.workers.dev              |
| Worker         | cooperative-staging                            | cooperative                                         |
| D1             | cooperative-staging-db                         | cooperative-production-db                           |
| R2 (приватний) | cooperative-staging-files                      | cooperative-production-files                        |
| Призначення    | Перевірка змін на вигаданих даних              | Підготовлене середовище майбутньої робочої програми |

Реєстр, імпорт і прикладні ролі ще не реалізовані. Стартова сторінка не означає готовність бухгалтерської програми. Даних членів кооперативу в цих ресурсах немає.

## Вхід

Cloudflare Access захищає весь трафік обох Workers. Політика **Cloudflare account** допускає чинних учасників акаунта Cloudflare. Володя входить своїм уже доданим обліковим записом Cloudflare; це не вхід через GitHub і не окремий пароль застосунку. Якщо вхід відхилено, перевірити, що використано саме запрошений акаунт і прийняте запрошення.

Це тимчасовий захист середовища розробки, а не реалізація ролей бухгалтера й голови. Нові учасники Cloudflare-акаунта також отримають доступ до сторінок за цією політикою. Перед імпортом реальних даних потрібні явний список користувачів застосунку, серверна авторизація та перевірені ролі.

## Як опублікувати зміни

### Staging: автоматично через GitHub Actions

Workflow `.github/workflows/deploy-staging.yml` публікує **лише staging**:

- після кожного злиття в `main` автоматично;
- для будь-якої гілки вручну: GitHub → Actions → «Deploy staging» → Run workflow → вибрати гілку. Так PR можна перевірити на staging до злиття. Кнопка працює лише для гілок, які вже містять цей workflow (за потреби спершу оновити гілку з `main`).

Workflow запускає `npm run deploy:staging` (спершу `npm run check`, потім deploy) і в кінці перевіряє, що staging без входу не віддає вміст. Одночасно йде лише один деплой. На staging можуть потрапити ще не переглянуті гілки, тому там лише вигадані дані, а доступ закритий Cloudflare Access.

Токен `CLOUDFLARE_API_TOKEN` (шаблон «Edit Cloudflare Workers», лише акаунт кооперативу) зберігається тільки в GitHub → Settings → Environments → `staging`. Токен не обмежується одним Worker'ом, тож технічно дає змогу оновити й production: workflow для production не додавати, кожну зміну workflow проводити через рев'ю. Якщо є підозра на витік, одразу відкликати токен у Cloudflare (My Profile → API Tokens) і створити новий.

### Вручну з комп'ютера

Node.js 22+, npm 11+. Працювати у гілці, створити PR. Потрібні доступ Cloudflare і авторизований Wrangler (`npx wrangler login`). Не передавати токени через чат.

```bash
npm ci
npm run check
git status
# Після коміту, у чистому робочому дереві:
npm run deploy:staging
```

Команда запускає перевірки та публікує лише staging. Перевірити сторінку через захищений вхід на комп'ютері й телефоні, обидві теми, вихід і повторний вхід.

Production випускає відповідальний за реліз після перевірки staging та погодження змін у PR:

```bash
git rev-parse HEAD
npm run deploy:production -- --confirm-production <повний-SHA-перевіреного-коміту>
```

Підставити реальний SHA без кутових дужок. Обидві команди відхиляють незакомічені зміни; production додатково перевіряє SHA. Це захист від помилки, а не заміна обмеження прав Cloudflare.

Cloudflare Builds для `cooperative`: production command `npx wrangler deploy --dry-run --env production`, preview command `npm run build:check`. Вони не публікують ані production, ані previews. Staging розгортає GitHub Actions (див. вище), production публікується тільки вручну. Звичайний `npm run deploy` без цілі завершується помилкою.

## Перевірки та відкат

- Без входу `/`, `/api/health`, `/styles.css` мають перенаправляти на Cloudflare Access, а не віддавати вміст.
- Після входу `/api/health` повертає `ok: true` та правильне `environment`. Це лише технічна перевірка Worker, не тест бази чи готовності реєстру.
- Невідомі бізнес-ендпоінти `/api/*` повертають 401 до реалізації авторизації. Технічний health закритий на рівні Cloudflare Access; локально доступний для тестів.
- `wrangler.jsonc` задає різні D1/R2 для кожного середовища; без `--env` немає віддалених прив'язок.
- Перед міграціями production зробити експорт D1 і перевірити відновлення. Міграції не виконуються разом із deploy.
- Для відкату коду: `npx wrangler deployments list --env production`, знайти попередній відомий справний version ID, потім `npx wrangler rollback <version-id> --env production` після підтвердження відповідального. Відкат коду не відкочує D1/R2.
- Після релізу/відкату повторити вхід, health, тему та перевірку закритого доступу. Не вимикати Access для діагностики.
