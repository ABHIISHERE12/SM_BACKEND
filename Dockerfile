FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Expose the port your backend runs on (usually 5000 or 8080)
EXPOSE 5000

CMD ["node", "server.js"]
