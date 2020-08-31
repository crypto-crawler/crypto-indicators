# Forked from https://github.com/microsoft/vscode-dev-containers/tree/master/containers/typescript-node
ARG USERNAME=node
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node AS builder

ARG USERNAME
USER ${USERNAME}
RUN mkdir /tmp/crypto-crawlers
WORKDIR /tmp/crypto-crawlers
COPY --chown=${USERNAME}:${USERNAME} ./ ./
RUN rm -rf node_modules/ && rm -rf dist/ && npm install && npm run build


FROM mcr.microsoft.com/vscode/devcontainers/javascript-node

RUN npm install -g pm2

ARG USERNAME
USER ${USERNAME}
ENV HOME /home/${USERNAME}
ENV USER ${USERNAME}
RUN mkdir /home/${USERNAME}/crypto-crawlers
WORKDIR /home/${USERNAME}/crypto-crawlers

COPY --from=builder --chown=${USERNAME}:${USERNAME} /tmp/crypto-crawlers/dist/ ./dist/
COPY --from=builder --chown=${USERNAME}:${USERNAME} /tmp/crypto-crawlers/node_modules/ ./node_modules
COPY --from=builder --chown=${USERNAME}:${USERNAME} /tmp/crypto-crawlers/*.json ./
COPY --from=builder --chown=${USERNAME}:${USERNAME} /tmp/crypto-crawlers/*.js ./

CMD ["pm2-runtime", "start", "pm2.config.js"]
