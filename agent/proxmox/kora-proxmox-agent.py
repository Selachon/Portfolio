#!/usr/bin/env python3
"""Colector de solo lectura Proxmox VE -> Kora.

No necesita dependencias de Python. Consulta exclusivamente la API oficial de
Proxmox mediante un token PVEAuditor y empuja un snapshot normalizado a Kora.
"""

from __future__ import annotations

import json
import os
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VERSION = "1.0.0"


def env(name: str, default: str | None = None, required: bool = False) -> str:
    value = os.environ.get(name, default)
    if required and not value:
        raise RuntimeError(f"Falta la variable {name}.")
    return value or ""


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "si"}


class ProxmoxClient:
    def __init__(self) -> None:
        self.base_url = env("PROXMOX_URL", "https://127.0.0.1:8006").rstrip("/")
        self.token_id = env("PROXMOX_TOKEN_ID", required=True)
        self.token_secret = env("PROXMOX_TOKEN_SECRET", required=True)
        self.timeout = int(env("PROXMOX_TIMEOUT_SECONDS", "12"))
        verify_tls = env_bool("PROXMOX_VERIFY_TLS", True)
        parsed = urllib.parse.urlparse(self.base_url)
        if not verify_tls and parsed.hostname not in {"127.0.0.1", "::1", "localhost"}:
            raise RuntimeError("PROXMOX_VERIFY_TLS=false solo se permite contra loopback.")
        self.ssl_context = ssl.create_default_context() if verify_tls else ssl._create_unverified_context()
        self.errors: list[str] = []

    def get(self, path: str, query: dict[str, Any] | None = None) -> Any:
        suffix = f"?{urllib.parse.urlencode(query)}" if query else ""
        request = urllib.request.Request(
            f"{self.base_url}/api2/json{path}{suffix}",
            headers={
                "Authorization": f"PVEAPIToken={self.token_id}={self.token_secret}",
                "Accept": "application/json",
                "User-Agent": f"kora-proxmox-agent/{VERSION}",
            },
        )
        with urllib.request.urlopen(request, timeout=self.timeout, context=self.ssl_context) as response:
            return json.load(response).get("data")

    def optional(self, path: str, default: Any, query: dict[str, Any] | None = None) -> Any:
        try:
            data = self.get(path, query)
            return default if data is None else data
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as error:
            self.errors.append(f"{path}: {type(error).__name__}")
            return default


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except (OSError, ValueError):
        return ""


def collect_sensors() -> list[dict[str, Any]]:
    sensors: list[dict[str, Any]] = []
    for hwmon in Path("/sys/class/hwmon").glob("hwmon*"):
        chip = read_text(hwmon / "name") or hwmon.name
        for input_path in hwmon.glob("temp*_input"):
            raw = read_text(input_path)
            try:
                temperature = float(raw) / 1000
            except ValueError:
                continue
            prefix = input_path.name.removesuffix("_input")
            sensors.append(
                {
                    "name": chip,
                    "label": read_text(hwmon / f"{prefix}_label") or prefix,
                    "temperature": round(temperature, 1),
                }
            )
    return sensors


def guest_interfaces(client: ProxmoxClient, node: str, guest_type: str, vmid: int, running: bool) -> list[Any]:
    if not running:
        return []
    if guest_type == "qemu":
        result = client.optional(f"/nodes/{node}/qemu/{vmid}/agent/network-get-interfaces", {})
        return result.get("result", []) if isinstance(result, dict) else []
    return client.optional(f"/nodes/{node}/lxc/{vmid}/interfaces", [])


def collect_guest(client: ProxmoxClient, resource: dict[str, Any]) -> dict[str, Any]:
    node = urllib.parse.quote(str(resource["node"]), safe="")
    guest_type = str(resource["type"])
    vmid = int(resource["vmid"])
    base = f"/nodes/{node}/{guest_type}/{vmid}"
    current = client.optional(f"{base}/status/current", {})
    status = current.get("status", resource.get("status", "unknown"))
    return {
        "id": resource.get("id", f"{guest_type}/{vmid}"),
        "type": guest_type,
        "vmid": vmid,
        "name": resource.get("name"),
        "status": status,
        "current": current,
        "config": client.optional(f"{base}/config", {}),
        "snapshots": client.optional(f"{base}/snapshot", []),
        "interfaces": guest_interfaces(client, node, guest_type, vmid, status == "running"),
    }


def collect_node(client: ProxmoxClient, raw_node: dict[str, Any], resources: list[dict[str, Any]]) -> dict[str, Any]:
    node_name = str(raw_node.get("node") or raw_node.get("name") or socket.gethostname())
    node = urllib.parse.quote(node_name, safe="")
    disks = client.optional(f"/nodes/{node}/disks/list", [])
    for disk in disks:
        devpath = disk.get("devpath")
        if devpath:
            disk["smart"] = client.optional(f"/nodes/{node}/disks/smart", {}, {"disk": devpath})

    guests = [
        collect_guest(client, resource)
        for resource in resources
        if resource.get("node") == node_name and resource.get("type") in {"lxc", "qemu"}
    ]
    return {
        "name": node_name,
        "status": raw_node.get("status", "online"),
        "statusDetail": client.optional(f"/nodes/{node}/status", {}),
        "storages": client.optional(f"/nodes/{node}/storage", []),
        "disks": disks,
        "network": client.optional(f"/nodes/{node}/network", []),
        "services": client.optional(f"/nodes/{node}/services", []),
        "tasks": client.optional(f"/nodes/{node}/tasks", [], {"limit": 50, "source": "all"}),
        "updates": client.optional(f"/nodes/{node}/apt/update", []),
        "certificates": client.optional(f"/nodes/{node}/certificates/info", []),
        "sensors": collect_sensors() if node_name.lower() == socket.gethostname().lower() else [],
        "guests": guests,
    }


def collect_snapshot(client: ProxmoxClient) -> dict[str, Any]:
    resources = client.get("/cluster/resources") or []
    nodes = client.get("/nodes") or []
    cluster_status = client.optional("/cluster/status", [])
    cluster_record = next((item for item in cluster_status if item.get("type") == "cluster"), {})
    return {
        "schemaVersion": 1,
        "agentId": env("KORA_AGENT_ID", socket.gethostname().lower()),
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "version": client.optional("/version", {}),
        "cluster": {
            "name": cluster_record.get("name", ""),
            "quorate": cluster_record.get("quorate"),
            "status": cluster_status,
        },
        "resources": resources,
        "nodes": [collect_node(client, node, resources) for node in nodes],
        "backupJobs": client.optional("/cluster/backup", []),
        "replicationJobs": client.optional("/cluster/replication", []),
        "local": {
            "hostname": socket.gethostname(),
            "loadavg": list(os.getloadavg()),
            "sensors": collect_sensors(),
        },
        "collectionErrors": client.errors,
    }


def push_snapshot(snapshot: dict[str, Any]) -> None:
    endpoint = env("KORA_INGEST_URL", required=True)
    token = env("KORA_INGEST_TOKEN", required=True)
    body = json.dumps(snapshot, separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": f"kora-proxmox-agent/{VERSION}",
        },
    )
    with urllib.request.urlopen(request, timeout=20, context=ssl.create_default_context()) as response:
        if response.status != 202:
            raise RuntimeError(f"Kora respondió HTTP {response.status}.")


def main() -> int:
    try:
        client = ProxmoxClient()
        snapshot = collect_snapshot(client)
        push_snapshot(snapshot)
        guests = sum(len(node["guests"]) for node in snapshot["nodes"])
        print(
            f"Snapshot enviado: {len(snapshot['nodes'])} nodo(s), {guests} invitado(s), "
            f"{len(client.errors)} consulta(s) opcional(es) omitida(s)."
        )
        return 0
    except Exception as error:  # systemd necesita un mensaje corto y un código fiable.
        print(f"Error de telemetría: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
