# Simple Dockerfile for Next.js 15 App Router on Hetzner
# Optimized for layer caching and BuildX cache mounts

FROM node:20-alpine AS builder
WORKDIR /app

# Accept build arguments early (before COPY to maximize cache hits)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED=false
ARG DISABLE_PWA=false

# Set as environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED=$NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED
ENV DISABLE_PWA=$DISABLE_PWA

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies with BuildX cache mount for faster rebuilds
# Cache persists across builds, only invalidates when package files change
# Diagnostic logging to identify root cause
RUN --mount=type=cache,target=/root/.npm \
    echo "🔍 DEBUG: Starting npm ci..." && \
    echo "🔍 DEBUG: Node version: $(node --version)" && \
    echo "🔍 DEBUG: npm version: $(npm --version)" && \
    echo "🔍 DEBUG: Package files present:" && \
    ls -la package.json package-lock.json && \
    echo "🔍 DEBUG: Attempting npm ci with --prefer-offline..." && \
    npm ci --prefer-offline --no-audit 2>&1 | tee /tmp/npm-output.log || \
    (EXIT_CODE=$?; \
     echo "❌ DEBUG: npm ci --prefer-offline failed with exit code: $EXIT_CODE" && \
     echo "🔍 DEBUG: npm output:" && \
     cat /tmp/npm-output.log && \
     echo "⚠️ Retrying with network access..." && \
     npm ci --no-audit 2>&1 | tee /tmp/npm-retry.log || \
     (RETRY_EXIT=$?; \
      echo "❌ DEBUG: npm ci retry failed with exit code: $RETRY_EXIT" && \
      echo "🔍 DEBUG: Retry output:" && \
      cat /tmp/npm-retry.log && \
      exit $RETRY_EXIT))

# Copy source code (this layer invalidates on code changes, but npm cache persists)
COPY . .

# Disable telemetry and set production mode
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Fix SSL issues for Google Fonts
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Validate critical environment variables and build in one step
# This reduces layers while maintaining validation
RUN if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then \
      echo "ERROR: NEXT_PUBLIC_SUPABASE_URL not set during build"; \
      echo "This variable must be passed as --build-arg during docker build"; \
      echo "See deployment scripts for proper usage"; \
      exit 1; \
    fi && \
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then \
      echo "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY not set during build"; \
      echo "This variable must be passed as --build-arg during docker build"; \
      echo "See deployment scripts for proper usage"; \
      exit 1; \
    fi && \
    echo "✅ Build-time environment variables validated" && \
    npm run build:standalone

# Verify build outputs exist
RUN echo "Verifying build outputs..." && \
    ls -la .next/ && \
    ls -la .next/static/ || echo "Warning: static directory structure differs" && \
    ls -la .next/standalone/ || echo "Warning: standalone directory missing"

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create system user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory
COPY --from=builder /app/public ./public

# Copy standalone server and its dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files to the standalone directory structure
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Verify files are in place
RUN ls -la .next/static/ && \
    echo "Static files copied successfully"

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
