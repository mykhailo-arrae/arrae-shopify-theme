# Remote Development Over SSH

## Zed editor

- Open Zed editor.
- Run the `cli: install` command from the command palette (cmd-shift-p) to install the zed CLI.
- Open a new terminal window on your host computer.
- Navigate to the project folder.
- Start up the Docker-based development environment with `./up` command.
- In another terminal window on your host computer, run `./edit` command.
- Follow the interactive prompts and select `ssh` in editor prompt, then select `Zed`
- Zed should connect to the container automatically.

![Use edit command](00-use-edit-command.png)

## Jetbrains IDEs - WebStorm, PHPStorm

### Prerequisites

- Open a new terminal window on your host computer.
- Start up the Docker-based development environment with `./up` command.
- In another terminal window on your host computer, run `./edit` command.
- Follow the interactive prompts and select `ssh` in editor prompt, then select `JetBrains`.

### Connecting via JetBrains Gateway

1. Open Webstorm and click on **SSH** under "Remote Development".

![WebStorm welcome screen](01-webstorm-welcome-screen.png)

2. Click the sprocket icon next to the New Connection dropdown to create a new SSH connection.

![Create connection](02-webstorm-create-connection.png)

3. Enter the SSH alias that was configured by the `./edit` command

![Create with SSH alias](03-webstorm-create-with-ssh-alias.png)

4. Select your newly created connection from the list.

![Select your connection](04-webstorm-select-your-connection.png)

5. Set the project folder path on the remote container to `/app`.

![Set project folder](05-webstorm-set-project-folder.png)

6. Once connected, you should see a success message and the IDE will open with remote development enabled.

![Connection success](06-webstorm-connection-success.png)
