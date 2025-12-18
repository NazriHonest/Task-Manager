
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files and Prisma schema FIRST (better layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies for build phase
RUN npm ci

# Set dummy DATABASE_URL for Prisma generate (required during build)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Install ONLY production dependencies (clean install, reduces image size)
RUN npm ci --only=production

# Create non-root user for security (important for production)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 8000

# Health check (pointing to correct endpoint - /health not /api/health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

# Start with Prisma migration then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]



# # # backend/Dockerfile
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


