FROM node:22-alpine

WORKDIR /app

COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

WORKDIR /app
COPY frontend ./frontend
COPY shared ./shared

WORKDIR /app/frontend

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
