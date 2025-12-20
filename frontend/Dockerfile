# Build stage with specific node version
FROM node:18.20.8-alpine AS build

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Clean install
RUN npm cache clean --force && \
    npm ci --legacy-peer-deps --prefer-offline --no-audit

# Copy all source files
COPY . .

# Build with verbose logging
RUN npm run build --verbose

# Verify build output
RUN ls -la /app/dist || (echo "Build output not found!" && exit 1)

# Production stage
FROM nginx:1.25-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Verify copied files
RUN ls -la /usr/share/nginx/html

# Create nginx user if not exists
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
