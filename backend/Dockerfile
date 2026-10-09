FROM node:22-bookworm-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci

WORKDIR /app
COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend

EXPOSE 3001

CMD ["npm", "run", "start"]