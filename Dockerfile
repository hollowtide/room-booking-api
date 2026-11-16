FROM node:22-alpine

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx knex migrate:latest && exec node src/server.js"]
