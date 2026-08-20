#!/usr/bin/env bash

set -Eeuxo pipefail

./devops/assert-linux-os.sh

# Ensure all project files belong to dockerdesktop group
sudo chgrp -R dockerdesktop ~/projects
sudo chgrp -R dockerdesktop /tmp

# Enable group permissions for all existing files
sudo chmod -R g+rwx ~/projects
sudo chmod -R g+rwx /tmp

# Set automatic ownership to group for every *new* file or folder
sudo chmod -R g+s ~/projects
sudo chmod -R g+s /tmp
