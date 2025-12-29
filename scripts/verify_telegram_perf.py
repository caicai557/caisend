"""
Verification script for Telegram Translation Performance.
"""

import time
import requests
import sys
import subprocess
import os


def start_server():
    """Start the server in background."""
    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()
    # Use a different port for testing
    env["PORT"] = "8001"

    proc = subprocess.Popen(
        [sys.executable, "src/seabox/api/server.py"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    print("Waiting for server to start...")
    time.sleep(5)  # Wait longer

    # Check if process is still running
    if proc.poll() is not None:
        print("Server failed to start!")
        print("STDOUT:", proc.stdout.read().decode())
        print("STDERR:", proc.stderr.read().decode())
        sys.exit(1)

    return proc


def test_perf():
    url = "http://127.0.0.1:8001/translate"
    payload = {"text": "Hello world", "target_lang": "zh-CN"}

    print("Testing translation performance...")
    start = time.time()

    # Warmup
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"Server failed to respond: {e}")
        return

    # 10 requests
    for i in range(10):
        resp = requests.post(url, json=payload)
        assert resp.status_code == 200
        assert (
            "你好" in resp.json()["translated"] or "世界" in resp.json()["translated"]
        )
        print(".", end="", flush=True)

    duration = time.time() - start
    print(f"\nTotal time for 10 requests: {duration:.4f}s")
    print(f"Avg time per request: {duration / 10:.4f}s")


if __name__ == "__main__":
    proc = start_server()
    try:
        test_perf()
    finally:
        proc.terminate()
        proc.wait()
