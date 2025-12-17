# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 1. Copy minimal files first (better caching)
COPY package*.json ./
COPY prisma ./prisma/

# 2. Install ALL dependencies for build phase
RUN npm ci

# ⭐⭐⭐ CRITICAL FIX FOR RENDER ⭐⭐⭐
# Prisma needs DATABASE_URL during build for schema validation
# Render doesn't pass runtime env vars during build
# So we set a DUMMY URL that Prisma can use
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# 3. Now prisma generate will work!
RUN npx prisma generate

# 4. Copy rest of source code
COPY . .

# 5. Build TypeScript (requires dev dependencies installed earlier)
RUN npm run build

# 6. Clean up: Reinstall only production dependencies
# This reduces image size significantly
RUN npm ci --only=production

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

# Start the built JavaScript
CMD ["node", "dist/server.js"]

# # backend/Dockerfile
# FROM node:20-alpine

# WORKDIR /app

# # Copy package files
# COPY package*.json ./
# COPY prisma ./prisma/

# # Install dependencies
# RUN npm ci --only=production

# # Copy source code
# COPY . .

# # Generate Prisma client
# RUN npx prisma generate

# # Build TypeScript
# RUN npm run build

# EXPOSE 8000

# # Health check
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

# # Start command
# CMD ["npm", "start"]