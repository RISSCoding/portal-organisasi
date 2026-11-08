Dev setup — Fedora Linux Workstation (GNOME)

Tested on Fedora 41+. All commands use dnf and GNU coreutils.
1. Bun
bash

curl -fsSL https://bun.sh/install | bash
exec $SHELL

2. Container runtime (Podman)
bash

systemctl --user enable --now podman.socket
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

Persist for the current user:
bash

echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock' >> ~/.bashrc

3. Testcontainers + Ryuk

If tests time out on Podman, add this to .env:
bash

export TESTCONTAINERS_RYUK_DISABLED=true

4. Gotchas

    GNU sed -i 's/old/new/' file — no empty-argument form like macOS.

    Podman rootless + Testcontainers: the systemd user socket must run as the same user that runs the tests. Do not sudo the test command.

## Running Background Workers
Untuk melihat email undangan (Mailpit) saat development lokal:
1. Nyalakan infrastruktur: `podman-compose -f infra/docker/docker-compose.yml up -d`
2. Jalankan API: `bun run --filter '@portal/api' dev`
3. Jalankan Web: `bun run --filter '@portal/web' dev`
4. **Jalankan Worker:** `bun run --filter '@portal/worker' dev`
5. Buka Mailpit di `http://localhost:8025`
