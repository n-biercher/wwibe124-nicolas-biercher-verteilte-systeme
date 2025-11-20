FROM node:20 AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . /app

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app /app

EXPOSE 3000

CMD ["npm", "run", "start"]
