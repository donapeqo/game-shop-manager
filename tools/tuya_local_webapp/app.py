#!/usr/bin/env python3
import json
import os
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import tinytuya


HOST = os.getenv("TUYA_WEB_HOST", "127.0.0.1")
PORT = int(os.getenv("TUYA_WEB_PORT", "8787"))
DEVICE_ID = os.getenv("TUYA_DEVICE_ID", "")
DEVICE_IP = os.getenv("TUYA_IP", "")
LOCAL_KEY = os.getenv("TUYA_LOCAL_KEY", "")
TUYA_VERSION = float(os.getenv("TUYA_VERSION", "3.5"))
DEFAULT_POD_ID = os.getenv("TUYA_DEFAULT_POD_ID", "").strip()
CONFIG_FILE = Path(__file__).parent / "pods.json"


timer_lock = threading.Lock()
timer_handle = None
timer_deadline = None
timer_action = None
timer_pod_id = None


def _ensure_config_file():
    if not CONFIG_FILE.exists():
        CONFIG_FILE.write_text("{}", encoding="utf-8")


def _load_pod_configs():
    _ensure_config_file()
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _save_pod_configs(configs):
    CONFIG_FILE.write_text(json.dumps(configs, indent=2), encoding="utf-8")

def _sanitize_configs(configs):
    sanitized = {}
    for pod_id, cfg in configs.items():
        sanitized[pod_id] = {
            "device_id": cfg.get("device_id"),
            "ip": cfg.get("ip"),
            "version": cfg.get("version"),
            "enabled": bool(cfg.get("enabled", True)),
        }
    return sanitized

def _list_selectable_configs():
    configs = _load_pod_configs()
    default = _default_config()
    if default:
        # Expose the runtime default plug as a reusable template.
        configs.setdefault("default", default)
    return _sanitize_configs(configs)


def _default_config():
    if not (DEVICE_ID and DEVICE_IP and LOCAL_KEY):
        return None
    return {
        "device_id": DEVICE_ID,
        "ip": DEVICE_IP,
        "local_key": LOCAL_KEY,
        "version": TUYA_VERSION,
        "enabled": True,
    }


def _resolve_config(pod_id):
    configs = _load_pod_configs()
    config = configs.get(pod_id)
    if config:
        return config

    if DEFAULT_POD_ID and pod_id == DEFAULT_POD_ID:
        return _default_config()

    # Backward compatibility: single device endpoints when no pod id is provided.
    if not pod_id:
        return _default_config()
    return None


def create_device_for_pod(pod_id):
    config = _resolve_config(pod_id)
    if not config or not config.get("enabled", True):
        raise ValueError(f"Pod '{pod_id}' is not registered or is disabled")
    device = tinytuya.OutletDevice(config["device_id"], config["ip"], config["local_key"])
    device.set_version(float(config.get("version", TUYA_VERSION)))
    device.set_socketPersistent(False)
    return device


def with_device(pod_id, action):
    device = create_device_for_pod(pod_id)
    return action(device)


def get_status(pod_id):
    return with_device(pod_id, lambda d: d.status())


def turn_on(pod_id):
    return with_device(pod_id, lambda d: d.turn_on())


def turn_off(pod_id):
    return with_device(pod_id, lambda d: d.turn_off())


def do_timer_action(pod_id, action):
    if action == "on":
        turn_on(pod_id)
    elif action == "off":
        turn_off(pod_id)
    else:
        raise ValueError("action must be 'on' or 'off'")


def clear_timer():
    global timer_handle, timer_deadline, timer_action, timer_pod_id
    if timer_handle is not None:
        timer_handle.cancel()
    timer_handle = None
    timer_deadline = None
    timer_action = None
    timer_pod_id = None


def schedule_timer(pod_id, seconds, action):
    global timer_handle, timer_deadline, timer_action, timer_pod_id
    if seconds <= 0:
        raise ValueError("seconds must be greater than 0")
    if action not in {"on", "off"}:
        raise ValueError("action must be 'on' or 'off'")
    if not pod_id:
        raise ValueError("pod_id is required")

    def run():
        try:
            do_timer_action(pod_id, action)
        finally:
            with timer_lock:
                clear_timer()

    with timer_lock:
        clear_timer()
        timer_deadline = time.time() + seconds
        timer_action = action
        timer_pod_id = pod_id
        timer_handle = threading.Timer(seconds, run)
        timer_handle.daemon = True
        timer_handle.start()


def get_timer_info():
    with timer_lock:
        if timer_deadline is None:
            return {"active": False, "seconds_remaining": 0, "action": None, "pod_id": None}
        remaining = int(max(0, round(timer_deadline - time.time())))
        return {"active": True, "seconds_remaining": remaining, "action": timer_action, "pod_id": timer_pod_id}


def register_pod(data):
    pod_id = str(data.get("pod_id", "")).strip()
    device_id = str(data.get("device_id", "")).strip()
    ip = str(data.get("ip", "")).strip()
    local_key = str(data.get("local_key", "")).strip()
    version = float(data.get("version", TUYA_VERSION))
    enabled = bool(data.get("enabled", True))

    if not pod_id or not device_id or not ip or not local_key:
        raise ValueError("pod_id, device_id, ip, and local_key are required")

    configs = _load_pod_configs()
    configs[pod_id] = {
        "device_id": device_id,
        "ip": ip,
        "local_key": local_key,
        "version": version,
        "enabled": enabled,
    }
    _save_pod_configs(configs)
    return {"pod_id": pod_id, "saved": True}

def register_pod_from_existing(data):
    pod_id = str(data.get("pod_id", "")).strip()
    source_pod_id = str(data.get("source_pod_id", "")).strip()
    if not pod_id or not source_pod_id:
        raise ValueError("pod_id and source_pod_id are required")

    configs = _load_pod_configs()
    source = configs.get(source_pod_id)
    if not source and source_pod_id == "default":
        source = _default_config()
    if not source:
        raise ValueError(f"source pod '{source_pod_id}' not found in gateway")

    configs[pod_id] = dict(source)
    _save_pod_configs(configs)
    return {"pod_id": pod_id, "source_pod_id": source_pod_id, "saved": True}


class Handler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        origin = self.headers.get("Origin", "*")
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, body, status=HTTPStatus.OK):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def _serve_index(self):
        index_path = Path(__file__).parent / "index.html"
        content = index_path.read_text(encoding="utf-8").encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self._set_cors_headers()
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/":
            self._serve_index()
            return
        if path == "/api/status":
            try:
                self._send_json({"ok": True, "data": get_status("")})
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)
            return
        if path == "/api/timer":
            self._send_json({"ok": True, "data": get_timer_info()})
            return
        if path == "/api/pods":
            self._send_json({"ok": True, "data": _list_selectable_configs()})
            return
        if path.startswith("/api/pods/") and path.endswith("/status"):
            pod_id = path[len("/api/pods/") : -len("/status")]
            try:
                self._send_json({"ok": True, "data": get_status(pod_id)})
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)
            return
        self._send_json({"ok": False, "error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            if path == "/api/on":
                self._send_json({"ok": True, "data": turn_on("")})
                return
            if path == "/api/off":
                self._send_json({"ok": True, "data": turn_off("")})
                return
            if path == "/api/timer":
                data = self._read_json()
                seconds = int(data.get("seconds", 0))
                action = data.get("action", "off")
                pod_id = str(data.get("pod_id", "")).strip()
                schedule_timer(pod_id, seconds, action)
                self._send_json({"ok": True, "data": get_timer_info()})
                return
            if path == "/api/timer/cancel":
                with timer_lock:
                    clear_timer()
                self._send_json({"ok": True, "data": get_timer_info()})
                return
            if path == "/api/pods/register":
                self._send_json({"ok": True, "data": register_pod(self._read_json())})
                return
            if path == "/api/pods/register-from-existing":
                self._send_json({"ok": True, "data": register_pod_from_existing(self._read_json())})
                return
            if path.startswith("/api/pods/") and path.endswith("/on"):
                pod_id = path[len("/api/pods/") : -len("/on")]
                self._send_json({"ok": True, "data": turn_on(pod_id)})
                return
            if path.startswith("/api/pods/") and path.endswith("/off"):
                pod_id = path[len("/api/pods/") : -len("/off")]
                self._send_json({"ok": True, "data": turn_off(pod_id)})
                return
            if path.startswith("/api/pods/") and path.endswith("/timer"):
                pod_id = path[len("/api/pods/") : -len("/timer")]
                data = self._read_json()
                seconds = int(data.get("seconds", 0))
                action = data.get("action", "off")
                schedule_timer(pod_id, seconds, action)
                self._send_json({"ok": True, "data": get_timer_info()})
                return
        except ValueError as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)
            return

        self._send_json({"ok": False, "error": "Not found"}, status=HTTPStatus.NOT_FOUND)


def main():
    _ensure_config_file()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Tuya web app running at http://{HOST}:{PORT}")
    if DEVICE_ID and DEVICE_IP:
        print(f"Default device: {DEVICE_ID} @ {DEVICE_IP} (v{TUYA_VERSION})")
    else:
        print("No default single-device env config set. Use /api/pods/register flow.")
    server.serve_forever()


if __name__ == "__main__":
    main()
