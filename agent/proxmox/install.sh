#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  printf '%s\n' "Ejecuta este instalador como root." >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

install -Dm755 "${SCRIPT_DIR}/kora-proxmox-agent.py" /usr/local/bin/kora-proxmox-agent
install -Dm644 "${SCRIPT_DIR}/kora-proxmox-agent.service" /etc/systemd/system/kora-proxmox-agent.service
install -Dm644 "${SCRIPT_DIR}/kora-proxmox-agent.timer" /etc/systemd/system/kora-proxmox-agent.timer

if [[ ! -e /etc/kora-proxmox-agent.env ]]; then
  install -m600 "${SCRIPT_DIR}/kora-proxmox-agent.env.example" /etc/kora-proxmox-agent.env
  printf '%s\n' "Creado /etc/kora-proxmox-agent.env. Completa sus dos secretos antes de activar el timer."
else
  printf '%s\n' "Se conserva el archivo existente /etc/kora-proxmox-agent.env."
fi

systemctl daemon-reload
printf '%s\n' "Después de editar el entorno, ejecuta:"
printf '%s\n' "  systemctl start kora-proxmox-agent.service"
printf '%s\n' "  journalctl -u kora-proxmox-agent.service -n 30 --no-pager"
printf '%s\n' "  systemctl enable --now kora-proxmox-agent.timer"
