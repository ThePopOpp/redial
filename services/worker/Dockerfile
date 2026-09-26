# syntax=docker/dockerfile:1
# Built from the repository root so it shares the single pinned lockfile:
#   docker build --file services/worker/Dockerfile --tag redial-worker:development .
#
# This image is a separate deployment unit from the web application on purpose.
# It is the only unit permitted to hold the Square access token, the Square
# webhook signature key and the Supabase service-role key.
FROM node:24.15.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS dependencies
WORKDIR /app
RUN npm install --global npm@11.12.1 --ignore-scripts
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

FROM node:24.15.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001
# Production dependencies only. A scoped copy of @supabase alone would miss its
# transitive `ws`, so the whole --omit=dev tree comes across. The Next build
# output, the public assets and the application source are deliberately absent:
# this container serves no pages and has no reason to be able to.
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node services/worker ./services/worker
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3001/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "services/worker/index.mjs"]
