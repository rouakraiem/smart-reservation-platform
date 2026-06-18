FROM node:20-alpine

WORKDIR /app

# Dépendances natives pour better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p data

EXPOSE 50051

CMD ["node", "src/index.js"]
