# syntax=docker/dockerfile:1
# Built from the repository root so it shares the single pinned lockfile:
#   docker build --file services/voice-gateway/Dockerfile --tag redial-voice:development .
#
# A third deployment unit, separate from the web application and the billing
# worker. It is reachable by a provider webhook, so it has a different exposure
# profile from either and does not share their container.
FROM node:24.15.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS dependencies
WORKDIR /app
RUN npm install --global npm@11.12.1 --ignore-scripts
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

FROM node:24.15.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3002
# Production dependencies only; the Next build, the public assets and the
# application source are deliberately absent. This container answers webhooks and
# serves no pages.
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node services/voice-gateway ./services/voice-gateway
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3002/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "services/voice-gateway/index.mjs"]
