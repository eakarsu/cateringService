FROM node:22-alpine AS dependencies
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY --chown=app:app backend/package.json ./backend/
COPY --chown=app:app backend/src ./backend/src
COPY --chown=app:app backend/db ./backend/db
USER app
EXPOSE 5001
CMD ["node","backend/src/index.js"]
