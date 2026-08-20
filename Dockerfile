#### FOUNDATION
FROM ghcr.io/the-vaan-group/vaango-shopify-theme:6.0.0 AS foundation

ARG GROUP_ID=1000
ARG USER_ID=1000

RUN echo 'Creating "node" user' \
    && groupadd --gid $GROUP_ID node \
    && useradd --uid $USER_ID --gid node --shell /bin/bash --create-home node \
    && echo '==============================' \
    && echo 'Configuring folder permissions' \
    && if [ ! -d "$TMP_DIR" ] ; then mkdir "$TMP_DIR" ; fi \
    && chown -R node:node ${TMP_DIR} ${WORKDIR} \
    && echo '===============================' \
    && echo 'Disabling Shopify CLI telemetry' \
    && mkdir -p /home/node/.config/shopify \
    && printf "[analytics]\nenabled = false\n" > /home/node/.config/shopify/config \
    && chown -R node:node /home/node/.config \
    && echo '====================================================' \
    && echo 'Configuring Shopify CLI environment variable aliases' \
    && printf '\nexport SHOPIFY_FLAG_STORE=$SHOPIFY_SHOP\n' >> /home/node/.bash_aliases \
    && printf '\nexport SHOPIFY_CLI_THEME_TOKEN=$SHOPIFY_CLI_ADMIN_AUTH_TOKEN\n' >> /home/node/.bash_aliases \
    && chown node:node /home/node/.bash_aliases \
    && echo 'Done'

ENV THEMEDIR="${WORKDIR}"

#### DEVELOPMENT
FROM foundation AS development

RUN echo 'Setting up SSH server' \
    && apt-get update \
    && apt-get install --assume-yes --no-install-recommends openssh-server \
    && echo 'Cleaning up apt-get' \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt \
    && echo 'Setting up user ssh config' \
    && mkdir -p /home/node/.ssh-server /home/node/.ssh \
    && ssh-keygen -t ed25519 -f /home/node/.ssh-server/ssh_host_ed25519_key -N '' \
    && ssh-keygen -t ed25519 -f /home/node/.ssh/id_ed25519 -N '' \
    && cat /home/node/.ssh/id_ed25519.pub > /home/node/.ssh/authorized_keys \
    && printf '%s\n' \
        'Port 2222' \
        'HostKey /home/node/.ssh-server/ssh_host_ed25519_key' \
        'PidFile /home/node/.ssh-server/sshd.pid' \
        'AuthorizedKeysFile .ssh/authorized_keys' \
        'PasswordAuthentication no' \
        > /home/node/.ssh-server/sshd_config \
    && chown -R node:node /home/node/.ssh-server /home/node/.ssh \
    && chmod 700 /home/node/.ssh \
    && chmod 600 /home/node/.ssh/authorized_keys /home/node/.ssh/id_ed25519 \
    && echo 'Done'

USER node

ENV IS_INSIDE_CONTAINER=1 \
    APP_CONTAINER_TYPE=development \
    XDG_CACHE_HOME=/home/node/.cache \
    XDG_CONFIG_HOME=/home/node/.config

COPY --chown=node:node devops/dotfiles/.bashrc /home/node/.bashrc

RUN echo "Provision XDG cache folder for persisted Shopify CLI sessions" \
    && mkdir ~/.cache \
    && echo 'Done'

ENTRYPOINT ["tini", "-sg", "--"]

#### CI
FROM foundation AS ci

USER node

ENTRYPOINT ["tini", "-sg", "--"]

#### CD
FROM foundation AS cd

USER node

ENV BASH_ENV="/home/node/.bash_aliases"

ENTRYPOINT ["tini", "-sg", "--"]
