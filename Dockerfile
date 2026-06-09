# ── 1단계: 빌드 ──────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# tsc 직접 호출 + 빌드 결과 확인
RUN npx tsc -p tsconfig.build.json && ls -la dist/ && test -f dist/main.js

# ── 2단계: 실행 ──────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
