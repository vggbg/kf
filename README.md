# Контактна форма (модал) — статика + Vercel функция + Resend

Собствена контактна форма, която вграждаш с **1 ред** във всеки свой домейн.
Безплатна е (Vercel Hobby + Resend free tier), без поддръжка на сървър.

## Как работи

```
твоя сайт ──> widget.js (бутоn + модал) ──> iframe(форма) ──> POST /api/send ──> Resend ──> твоята поща
```

| Файл | Роля |
|---|---|
| `index.html` + `styles.css` + `form.js` | Самата форма (отваря се в iframe) |
| `widget.js` | Embed script: плаващ бутон + модал |
| `api/send.py` | Vercel Python функция: валидация, honeypot, rate limit, изпращане |
| `requirements.txt` | Зависимости на функцията (Flask) |

## Стъпка 1 — Resend (2 мин)

1. Регистрация на [resend.com](https://resend.com) -> **API Keys** -> създай ключ (`re_...`).
2. За реална употреба: **Domains** -> Add domain -> добави DNS записите си ->
   verify. После ползвай подател от твоя домейн (виж `MAIL_FROM`).
3. За бърз тест без verify: остави `MAIL_FROM` по подразбиране
   (`onboarding@resend.dev`) — Resend праща само към имейла на твоя акаунт.

## Стъпка 2 — Vercel (3 мин)

1. Качи папката в GitHub (ново репо или подпапка в съществуващо).
2. [vercel.com](https://vercel.com) -> **Add New -> Project** -> import на репото.
   - Ако формата е в подпапка: **Root Directory** = пътят до подпапката.
3. **Settings -> Environment Variables** — добави:

| Променлива | Стойност | Зад. |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | да |
| `CONTACT_EMAIL` | електронната поща, на която да идват съобщенията | да |
| `MAIL_FROM` | `Contact Form <forma@tvoydomain.com>` | не |
| `ALLOWED_ORIGINS` | празно (по подразбиране само собственият домейн) | не |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | `5` / `600` (по подразбиране) | не |

4. **Deploy**. Готово — получаваш адрес тип `https://tvoy-proekt.vercel.app`.

## Стъпка 3 — Вграждане на всеки домейн

Вариант А — плаващ бутон долу вдясно (пред `</body>`):

```html
<script src="https://tvoy-proekt.vercel.app/widget.js"
        data-button-text="Формуляр за контакт"></script>
```

Вариант Б — като на informiran-izbor.com: връзка във футъра, без плаващ бутон:

```html
<a href="#" data-cfw-open>За въпроси, предложения, грешки или друго,
ползвайте формулярът за контакт</a>
<script src="https://tvoy-proekt.vercel.app/widget.js"
        data-hide-button="1"></script>
```

Опционални атрибути на script тага:

| Атрибут | Стойност по подразбиране |
|---|---|
| `data-button-text` | `Формуляр за контакт` |
| `data-color` | `#e67e22` (само hex) |
| `data-hide-button` | `1` = без плаващ бутон, отваря се от `[data-cfw-open]` |
| `data-endpoint` | домейнът на `widget.js` (задай само ако качваш script-а другаде) |

Промяна в `index.html` / `form.js` -> `git push` -> Vercel redeploy ->
всички домейни са обновени автоматично.

## Защита от спам (вградена)

- **Honeypot** — скрито поле `company`; ботовете го попълват и се игнорират.
- **Rate limit** — по подразбиране 5 заявки на IP за 10 минути
  (in-memory, по инстанция; за строг лимит свържи Upstash Redis).
- **Origin проверка** — API-то приема заявки само от собствения си домейн
  (или списъка в `ALLOWED_ORIGINS`).
- Отговорите от ботове връщат "успех", за да не ги навъртят.

## Често срещани

- **Не идват съобщения** -> провери Vercel -> Logs; най-често `MAIL_FROM` е от
  недverify-нат домейн (Resend отхвърля) или `CONTACT_EMAIL` е с правописна грешка.
- **Пробно изпращане не пристига при клиент** -> с `onboarding@resend.dev` Resend
  праща само към акаунта ти; verify-ни домейн за реални изпращания.
- **Друг цвят/текст на бутона** -> без промяна по кода: `data-color`,
  `data-button-text` в snippet-а.
