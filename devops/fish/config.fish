fish_add_path -m /usr/sbin
fish_add_path -m /bin
fish_add_path -m /usr/bin
fish_add_path -m /usr/local/sbin
fish_add_path -m /usr/local/bin
fish_add_path -m ~/.local/bin
fish_add_path -m "$WORKDIR/bin"
fish_add_path -m "$WORKDIR/node_modules/.bin"

set -gx SHOPIFY_FLAG_STORE $SHOPIFY_SHOP
set -gx SHOPIFY_CLI_THEME_TOKEN $SHOPIFY_CLI_ADMIN_AUTH_TOKEN

if status is-interactive
  starship init fish | source

  abbr --add rg 'rg --smart-case'
  abbr --add yarn 'bb run'
  abbr --add npm 'pnpm'
end
