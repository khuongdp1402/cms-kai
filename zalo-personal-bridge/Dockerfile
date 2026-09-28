# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build
RUN npm prune --omit=dev

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Non-root user
USER 10001:10001

COPY --from=builder --chown=10001:10001 /app/package.json ./
COPY --from=builder --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=builder --chown=10001:10001 /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["node", "dist/main.js"]
