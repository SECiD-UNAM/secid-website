# SECiD Alumni Platform - Docker Development Environment
# ======================================================

# Stage 1: Base image with Node.js
FROM node:20.17-alpine AS base

# Install essential tools
RUN apk add --no-cache \
    git \
    bash \
    make \
    python3 \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Set working directory
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install dependencies with better caching
RUN npm ci --only=production

# Copy dev dependencies separately for better layer caching
COPY package*.json ./
RUN npm ci

# Stage 3: Development environment
FROM base AS development

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001 && \
    chown -R astro:nodejs /app

# Switch to non-root user
USER astro

# Expose ports
EXPOSE 4321 4322

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4321', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Default command for development
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 4: Builder
FROM base AS builder

# Copy node_modules and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Stage 5: Production runner
FROM node:20.17-alpine AS runner

# Install serve for static hosting
RUN npm install -g serve

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001 && \
    chown -R astro:nodejs /app

USER astro

# Expose port
EXPOSE 3000

# Health check for production
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Serve the static files
CMD ["serve", "-s", "dist", "-l", "3000"]