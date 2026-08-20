# PATH configuration
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin"

# Development paths
export PATH="$HOME/.local/bin:$PATH"
export PATH="$WORKDIR/bin:$PATH"
export PATH="$WORKDIR/node_modules/.bin:$PATH"

# Shell options for predictable behavior
shopt -s histappend         # Append to history file
shopt -s checkwinsize       # Update LINES and COLUMNS after each command
shopt -s cmdhist            # Save multi-line commands as one command
shopt -s expand_aliases     # Expand aliases
shopt -s globstar          # ** recursive globbing
shopt -s nocaseglob        # Case-insensitive globbing

# History configuration
export HISTSIZE=50000
export HISTFILESIZE=100000
export HISTCONTROL=ignoreboth:erasedups
export HISTIGNORE="ls:ll:cd:pwd:exit:date:* --help"
export HISTTIMEFORMAT="%Y-%m-%d %T "

# Environment variables
export PAGER=less
export LESS='-R -F -X -i'
export GREP_OPTIONS='--color=auto'
export CLICOLOR=1

# Shell prompt
export PS1='[DOCKER]:\u@\h:\w\$ '

# Alias `yarn [task_name]` to `bb run [task_name]`
alias yarn='bb run'
