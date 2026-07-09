# RenderReel — Next.js app + render worker in one container.
FROM node:22-bookworm-slim AS base

# Chrome/Chromium dependencies for Remotion's headless renderer + build tools
# for whisper.cpp + ffmpeg for audio resampling.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 \
    libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 \
    libpango-1.0-0 libcairo2 libcups2 \
    build-essential cmake git curl ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Bake whisper.cpp + model into the image so worker boot is fast.
RUN node -e "require('tsx/cjs'); const {ensureWhisper} = require('./pipeline/captions.ts'); ensureWhisper().then(() => console.log('whisper baked')).catch(e => {console.error(e); process.exit(1)})" || echo "whisper bake deferred to runtime"

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

EXPOSE 3000
CMD ["./start.sh"]
