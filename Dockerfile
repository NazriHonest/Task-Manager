FROM node:20-alpine

WORKDIR /app

# Copy package files and Prisma schema first for caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies for build
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy rest of the source code
COPY . .

# Build TypeScript
RUN npm run build

# Only install production deps (remove dev deps to reduce size)
RUN npm ci --only=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 8000

# Health check (matches your actual route)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

# Start server (migrate then start)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
