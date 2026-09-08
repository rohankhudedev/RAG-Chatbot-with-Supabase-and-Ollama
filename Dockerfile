# ============================================================
# Stage 1: Install dependencies
# ============================================================
# Use Node.js 22 with Alpine Linux.
# Alpine is a small Linux distribution, which keeps the image smaller.
FROM node:22-alpine AS deps

# All commands from this point run inside /app
WORKDIR /app

# Copy only dependency files first.
# This allows Docker to cache the yarn install layer.
# If your source code changes but package.json/yarn.lock don't,
# Docker can reuse this layer instead of installing everything again.
COPY package.json yarn.lock ./

# Install exactly the dependencies specified in yarn.lock.
# --frozen-lockfile prevents Yarn from modifying yarn.lock.
RUN yarn install --frozen-lockfile


# ============================================================
# Stage 2: Build the Next.js application
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy the node_modules installed in the previous stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy the complete application source code.
COPY . .

# Disable Next.js telemetry during the Docker build.
ENV NEXT_TELEMETRY_DISABLED=1

# Create the production Next.js build.
#
# This runs:
#   yarn build
#
# The resulting .next directory contains the production build.
RUN yarn build


# ============================================================
# Stage 3: Production runtime
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Tell Next.js that this is a production environment.
ENV NODE_ENV=production

# Disable Next.js telemetry.
ENV NEXT_TELEMETRY_DISABLED=1


# ------------------------------------------------------------
# Create a non-root user
# ------------------------------------------------------------
# By default Docker containers run as root.
# Running the application as a normal user is safer.
#
# Create:
#   group: nodejs
#   user : nextjs
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs


# ------------------------------------------------------------
# Copy only what is required to run the Next.js application
# ------------------------------------------------------------

# Copy the public folder.
COPY --from=builder /app/public ./public

# Copy Next.js standalone production server.
#
# This is created because next.config.ts contains:
#
#   output: 'standalone'
#
# The standalone build contains the production server and
# only the dependencies required to run it.
COPY --from=builder --chown=nextjs:nodejs \
    /app/.next/standalone ./

# Copy static Next.js files.
COPY --from=builder --chown=nextjs:nodejs \
    /app/.next/static ./.next/static


# ------------------------------------------------------------
# Run application as non-root user
# ------------------------------------------------------------
USER nextjs


# Next.js will listen on port 3000.
EXPOSE 3000

# Application port.
ENV PORT=3000

# IMPORTANT:
# 0.0.0.0 allows the application to accept connections
# from outside the container.
ENV HOSTNAME=0.0.0.0


# Start the Next.js standalone server.
#
# The standalone build creates:
#
#   /app/server.js
#
CMD ["node", "server.js"]


## Why three stages?
### Think of it like this:

#Stage 1
#deps
#│
#└── Install node_modules
#          ↓
#Stage 2
#builder
#│
#├── Copy source code
#├── Copy node_modules
#└── yarn build
#          ↓
#Stage 3
#runner
#│
#├── Copy production build
#├── Don't copy source unnecessarily
#├── Don't copy development dependencies
#└── Run Next.js

#The important benefit is that the final Docker image is much smaller than simply copying your entire development environment into it.