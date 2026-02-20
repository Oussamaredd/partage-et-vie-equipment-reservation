FROM node:22

WORKDIR /app

CMD ["sh", "-lc", "npm install && npm run dev -- --host 0.0.0.0 --port 5173"]
