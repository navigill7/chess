# Build stage with specific node version
FROM node:18.20.8-alpine AS build

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Clean install with better error handling
RUN npm cache clean --force && \
    npm ci --legacy-peer-deps --prefer-offline --no-audit || \
    (echo "npm ci failed, trying npm install" && npm install --legacy-peer-deps)

# Copy all source files
COPY . .

# Set build-time environment variables
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_GOOGLE_OAUTH_CLIENT_ID

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=${VITE_GOOGLE_OAUTH_CLIENT_ID}

# Build with better error handling
RUN npm run build || \
    (echo "=== BUILD FAILED ===" && \
     echo "Environment variables:" && \
     env | grep VITE_ && \
     echo "Package.json build script:" && \
     cat package.json | grep -A 2 '"scripts"' && \
     echo "Directory contents:" && \
     ls -la && \
     echo "Checking for syntax errors:" && \
     npm run build 2>&1 | head -50 && \
     exit 1)

# Verify build output exists
RUN if [ -d "/app/dist" ]; then \
      echo "✓ Build successful - dist directory found"; \
      ls -la /app/dist; \
    else \
      echo "✗ Build failed - dist directory not found"; \
      echo "Available directories:"; \
      ls -la /app; \
      exit 1; \
    fi

# Production stage
FROM nginx:1.25-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from dist directory
COPY --from=build /app/dist /usr/share/nginx/html

# Verify copied files
RUN ls -la /usr/share/nginx/html && \
    if [ ! -f "/usr/share/nginx/html/index.html" ]; then \
      echo "ERROR: index.html not found!"; \
      exit 1; \
    fi

# Create nginx user if not exists
RUN addgroup -g 101 -S nginx 2>/dev/null || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx 2>/dev/null || true

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
