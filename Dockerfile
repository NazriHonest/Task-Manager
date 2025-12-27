FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install everything (including devDeps) to build
RUN npm install

# Generate Prisma client - IMPORTANT: This must happen before build
RUN npx prisma generate

COPY . .

# Build TypeScript
RUN npm run build

# Instead of re-running npm ci (which deletes things), 
# just prune the dev dependencies if you really want to save space.
# Or, skip this line to ensure all necessary tools stay present.
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 8000

# Updated health check to match your server.ts (remove /api if it's just /health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1
  

# Start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]