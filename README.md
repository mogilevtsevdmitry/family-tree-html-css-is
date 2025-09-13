# Семейное дерево — минимальный каркас

Чистые **HTML/CSS/JS**, адаптив, светлая тема, скругления, тени. Полотно с панорамированием и масштабированием, карточка человека и кнопка центрирования.

## Локальный запуск
Просто открой `index.html` в браузере. Для корректной работы в некоторых браузерах можно поднимать любой статический сервер:
```bash
# python
python -m http.server 8080
# или
npx serve .
```

## Структура
```
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── canvas.js
│   └── card.js
└── .github/workflows/pages.yml   # деплой на GitHub Pages (опционально)
```

## Команды для загрузки в GitHub
```bash
git init
git add .
git commit -m "feat: family-tree starter"
git branch -M main
git remote add origin <ВАШ_HTTPS_ИЛИ_SSH_URL_РЕПОЗИТОРИЯ>
git push -u origin main
```

### Включить GitHub Pages
**Settings → Pages → Build and deployment → Source: GitHub Actions** (workflow уже лежит в репозитории).
После первого пуша и успешного workflow получите ссылку вида: `https://<username>.github.io/<repo>/`.

## Лицензия
MIT
