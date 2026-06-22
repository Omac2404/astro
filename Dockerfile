# Gökname — EasyPanel / Docker imajı
# Tek imajda: Node 22 (Next.js) + Python 3.12 (skyfield rapor motoru) + headless Chrome (PDF render).
# Serverless'ta çalışmaz; bu imaj VPS/EasyPanel içindir (rapor üretimi child_process ile Python+Node+Chrome sürer).

FROM python:3.12-bookworm

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    # render.mjs sistemdeki Chrome'u bu yoldan bulur (CANDIDATES'ta da var; net olsun diye sabitliyoruz)
    CHROME_PATH=/usr/bin/google-chrome-stable \
    # pipeline.ts venv python'unu buradan çağırır (Linux varsayılanı /app/.venv/bin/python ile aynı)
    PYTHON_BIN=/app/.venv/bin/python

# 1) Node 22 (NodeSource) + Google Chrome stable + Türkçe/sembol fontları
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl wget gnupg ca-certificates \
      fonts-noto-core fonts-noto-cjk fonts-dejavu \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends google-chrome-stable \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2) Node bağımlılıkları — katman cache'i için önce sadece manifestler.
#    npm ci yerine npm install: lockfile Windows'ta üretildiğinde Linux'a özgü optional
#    bağımlılıklar (@emnapi/* vb.) eksik kalabiliyor; npm install bu drift'e dayanıklıdır.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# 3) Python sanal ortam + rapor motoru bağımlılıkları (skyfield, jinja2, fonttools, tzdata)
COPY report/natal/requirements.txt report/natal/requirements.txt
RUN python3 -m venv /app/.venv \
 && /app/.venv/bin/pip install --no-cache-dir --upgrade pip \
 && /app/.venv/bin/pip install --no-cache-dir -r report/natal/requirements.txt

# 4) Uygulama kaynakları + production build
COPY . .
RUN npm run build

# Kalıcı veri dizini (EasyPanel'de /app/.data volume olarak bağlanmalı — üyeler/siparişler/PDF'ler)
RUN mkdir -p /app/.data

EXPOSE 3000
# next start (port 3000). ANTHROPIC_API_KEY ortam değişkeni EasyPanel'den verilir.
CMD ["npm", "start"]
