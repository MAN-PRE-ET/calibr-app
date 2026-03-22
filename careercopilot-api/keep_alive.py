"""
CALIBR Keep-Alive Script
Pings /health every 14 minutes to prevent Render free tier spin-down.

Usage:
    pip install requests
    python keep_alive.py

Or with a custom URL:
    python keep_alive.py https://calibr-api.onrender.com
"""

import sys
import time
import datetime

try:
    import requests
except ImportError:
    print("Install requests first: pip install requests")
    sys.exit(1)

API_URL = sys.argv[1] if len(sys.argv) > 1 else "https://calibr-api.onrender.com"
HEALTH_URL = f"{API_URL}/health"
INTERVAL_SECONDS = 14 * 60  # 14 minutes


def ping():
    try:
        resp = requests.get(HEALTH_URL, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"[{ts}] ✅ {data.get('app', 'API')} is alive — status: {data.get('status', 'ok')}")
        else:
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"[{ts}] ⚠️  Unexpected status code: {resp.status_code}")
    except requests.exceptions.ConnectionError:
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        print(f"[{ts}] ❌ Connection failed — server may be starting up (this is normal on first ping)")
    except Exception as e:
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        print(f"[{ts}] ❌ Error: {e}")


if __name__ == "__main__":
    print(f"🚀 CALIBR Keep-Alive started")
    print(f"   Pinging: {HEALTH_URL}")
    print(f"   Interval: every {INTERVAL_SECONDS // 60} minutes")
    print(f"   Press Ctrl+C to stop\n")

    # Ping immediately on start
    ping()

    while True:
        time.sleep(INTERVAL_SECONDS)
        ping()
