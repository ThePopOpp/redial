FROM node:24.12.0-alpine@sha256:c921b97d4b74f51744057454b306b418cf693865e73b8100559189605f6955b8 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --global npm@11.12.1 && npm ci --ignore-scripts

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 REDIAL_STANDALONE=1
RUN npm run build

FROM node:24.12.0-alpine@sha256:c921b97d4b74f51744057454b306b418cf693865e73b8100559189605f6955b8 AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S redial && adduser -S redial -G redial && mkdir -p /app/.redial && chown redial:redial /app/.redial
COPY --from=build --chown=redial:redial /app/.next/standalone ./
COPY --from=build --chown=redial:redial /app/.next/static ./.next/static
COPY --from=build --chown=redial:redial /app/public ./public
USER redial
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.js"]
