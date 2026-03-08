# Tuya Local Web App (Mac)

Simple local web app to control one Tuya smart plug and run a timer action.

## 1) Prerequisites

- Python 3
- `tinytuya` installed:

```bash
python3 -m pip install --upgrade tinytuya
```

## 2) Set env vars

```bash
export TUYA_DEVICE_ID="REPLACE_WITH_DEVICE_ID"
export TUYA_IP="REPLACE_WITH_DEVICE_IP"
export TUYA_LOCAL_KEY="REPLACE_WITH_LOCAL_KEY"
export TUYA_VERSION="3.5"
export TUYA_WEB_HOST="127.0.0.1"
export TUYA_WEB_PORT="8787"
```

## 3) Run app

```bash
cd /Users/luqmannor/dev/game\ shop\ management/game-shop-management/tools/tuya_local_webapp
python3 app.py
```

Open:

`http://127.0.0.1:8787`

## API Endpoints

- `GET /api/status`
- `POST /api/on`
- `POST /api/off`
- `GET /api/timer`
- `POST /api/timer` body: `{"seconds":300,"action":"off"}`
- `POST /api/timer/cancel`
- `POST /api/pods/register` body: `{"pod_id":"<uuid>","device_id":"...","ip":"...","local_key":"...","version":"3.5","enabled":true}`
- `POST /api/pods/register-from-existing` body: `{"pod_id":"<target-pod-id>","source_pod_id":"<existing-pod-id>"}`
- `POST /api/pods/{podId}/on`
- `POST /api/pods/{podId}/off`
- `GET /api/pods/{podId}/status`
- `POST /api/pods/{podId}/timer` body: `{"seconds":300,"action":"off"}`
- `GET /api/pods` (sanitized list, no local keys)

## Notes

- Keep the Mac on and awake while running.
- Keep plug and Mac on the same reachable LAN.
- If you re-pair the plug, `TUYA_LOCAL_KEY` changes.
- Pod registrations are stored in `pods.json` next to `app.py`.
- `pods.json` contains local keys and is git-ignored by default.
- Never commit real values for `TUYA_LOCAL_KEY` or dump files from TinyTuya.
