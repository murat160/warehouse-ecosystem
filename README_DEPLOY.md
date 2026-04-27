# Деплой WMS Ecosystem на Hostinger VPS

Полная схема:

```
Claude Code → GitHub (main) → Hostinger VPS → nginx + pm2 → http://IP/admin
```

Всё backend + 5 frontend + БД работает на одном VPS.

---

## 0. Что нужно

- Hostinger VPS, Ubuntu 22.04 / 24.04 LTS, ≥ 2 ГБ RAM (для node build).
- IP-адрес VPS + sudo-пользователь.
- GitHub-репозиторий с этим монорепо (см. конец документа — команды).
- Опционально: домен с A-записью на IP VPS.

---

## 1. Настроить VPS (один раз)

```bash
ssh root@<IP_VPS>

# Базовые пакеты
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw nginx build-essential

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# pm2 (process manager для backend)
sudo npm install -g pm2

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

node -v && npm -v && pm2 -v && nginx -v
```

---

## 2. Создать deploy-ключ для GitHub

На VPS:

```bash
ssh-keygen -t ed25519 -C "vps-deploy-wms" -f ~/.ssh/id_ed25519_wms -N ""
cat ~/.ssh/id_ed25519_wms.pub
```

Скопируй вывод в GitHub: **Repo → Settings → Deploy keys → Add** (read-only достаточно).

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-wms
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_wms
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

ssh -T github-wms
```

---

## 3. Первый clone

```bash
sudo mkdir -p /var/www/wms
sudo chown -R $USER:$USER /var/www/wms

# Замени USERNAME/REPO на свои
git clone github-wms:USERNAME/warehouse-ecosystem.git /var/www/wms

cd /var/www/wms
chmod +x deploy/deploy.sh
```

---

## 4. Настроить .env

```bash
cd /var/www/wms
cp .env.example .env
cd backend/api && cp .env.example .env && cd /var/www/wms

# Сгенерировать сильный JWT_SECRET
JWT=$(openssl rand -hex 32)

# Записать его в backend/api/.env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" backend/api/.env

# CORS — пока разрешим всё (для прокси через nginx это безопасно):
sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=*|" backend/api/.env
```

---

## 5. Первый деплой

```bash
cd /var/www/wms
./deploy/deploy.sh --first-run
```

Скрипт делает:

1. Проверяет Node ≥ 20, npm, pm2.
2. `git pull`.
3. `npm ci` (workspace-aware — ставит зависимости для backend и всех 5 фронтов).
4. `prisma migrate deploy` + сидинг (создаёт SQLite БД с тестовыми данными).
5. Билдит backend и 5 фронтендов с правильными base-путями (`/staff/`, `/admin/` и т.д.).
6. Стартует backend через pm2.
7. Перезагружает nginx (если настроен — см. шаг 6).

**Если build упадёт** — смотри вывод. Самые частые проблемы внизу.

---

## 6. Настроить nginx

```bash
sudo cp /var/www/wms/deploy/nginx/wms.conf /etc/nginx/sites-available/wms
sudo nano /etc/nginx/sites-available/wms
# Замени `IP_OR_DOMAIN` на свой IP/домен в строке `server_name`

sudo ln -s /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/wms
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Открой в браузере:

| URL | Что |
|---|---|
| `http://<IP>/api/health` | JSON с `status: ok, database: up` |
| `http://<IP>/admin/` | Admin Panel — войди как W-002 / 0000 |
| `http://<IP>/staff/` | Staff App |
| `http://<IP>/supervisor/` | Supervisor Panel |
| `http://<IP>/seller/` | Seller Portal |
| `http://<IP>/courier/` | Courier Dispatch |
| `http://<IP>/` | редирект на `/admin/` |

---

## 7. HTTPS (если есть домен)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ВАШДОМЕН.com
```

Certbot сам обновит nginx-конфиг и поставит автообновление.

---

## 8. Workflow обновления

**Локально:**

```bash
git add .
git commit -m "feature: ..."
git push origin main
```

**На VPS:**

```bash
cd /var/www/wms
./deploy/deploy.sh
```

Готово.

### Автодеплой через GitHub Actions

В файле `.github/workflows/deploy.yml` уже всё настроено. Добавь в repo settings:

**Settings → Secrets and variables → Actions → New repository secret:**

| Имя | Значение |
|---|---|
| `VPS_HOST` | IP твоего VPS |
| `VPS_USER` | SSH-пользователь (root или другой) |
| `VPS_SSH_KEY` | приватный ssh-ключ (содержимое `~/.ssh/id_ed25519`) |
| `VPS_APP_DIR` | `/var/www/wms` |

После этого каждый `git push origin main` → автоматически делает SSH на VPS и запускает deploy.sh.

---

## 9. PostgreSQL вместо SQLite (опционально, для продакшна)

```bash
sudo apt install -y postgresql
sudo -u postgres psql <<EOF
CREATE USER wms WITH PASSWORD 'wms_strong_password';
CREATE DATABASE wms OWNER wms;
GRANT ALL PRIVILEGES ON DATABASE wms TO wms;
EOF

# Поменять провайдер в Prisma:
nano /var/www/wms/backend/api/prisma/schema.prisma
# Поменять строку:  provider = "sqlite"  →  provider = "postgresql"

# В backend/api/.env:
DATABASE_URL="postgresql://wms:wms_strong_password@localhost:5432/wms?schema=public"

# Применить:
cd /var/www/wms
npm --workspace backend/api run db:generate
npm --workspace backend/api run db:migrate
npm --workspace backend/api run db:seed
pm2 reload wms-api
```

---

## 10. Частые проблемы

| Проблема | Решение |
|---|---|
| `Permission denied (publickey)` при git pull | Проверь deploy-key и `~/.ssh/config` (шаг 2) |
| `Node version too old` | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo bash - && sudo apt install -y nodejs` |
| `npm ci` падает на peer deps | Удали `package-lock.json`, запусти `npm install`, закоммить новый lock |
| Build падает "out of memory" | На 1 ГБ RAM мало — добавь swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
| 404 при перезагрузке страницы | Проверь, что в nginx есть `try_files $uri $uri/ /admin/index.html;` |
| `502 Bad Gateway` на /api/ | Backend не запустился. Смотри: `pm2 logs wms-api` |
| `Cannot find module '@wms/shared-types'` при build | `npm ci` не отработал — workspaces должны линковать. Запусти `npm install` из корня |
| CORS error в браузере | Проверь `CORS_ORIGINS` в `backend/api/.env`. Через nginx-прокси `*` нормально |
| Сайт открывается, но `/admin/` пустой | `dist/` не собрался. Проверь логи build, перезапусти `./deploy/deploy.sh` |

---

## 11. Полезные команды

```bash
# Логи backend
pm2 logs wms-api
pm2 status
pm2 restart wms-api

# Логи nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Проверить, что лежит
ls /var/www/wms/apps/*/dist
ls /var/www/wms/backend/api/dist

# Откат
cd /var/www/wms
git log --oneline -5
git reset --hard <commit_hash>
./deploy/deploy.sh

# Prisma Studio (UI для БД)
cd /var/www/wms/backend/api
npx prisma studio   # откроется на :5555
```

---

## 12. Команды для GitHub remote

После того как монорепо у тебя локально:

```bash
cd "C:\Users\User\Downloads\warehouse-ecosystem"

# Один раз — настроить git
git config --global user.name "Murat"
git config --global user.email "your@email.com"

# Init + коммит
git init -b main
git add .
git commit -m "init: warehouse-ecosystem monorepo (Stage 1+2: monorepo + backend)"

# Создать репо на GitHub (через сайт или gh CLI)
# Вариант 1 — gh:
gh repo create warehouse-ecosystem --private --source=. --remote=origin --push

# Вариант 2 — вручную:
# 1) github.com → New repository → warehouse-ecosystem → Private → не добавляй README
# 2) Затем:
git remote add origin git@github.com:USERNAME/warehouse-ecosystem.git
git push -u origin main
```
