FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist/ ./dist/
COPY agent.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
