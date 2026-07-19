"""
KAWACH pre-demo warm-up. Run this ~10 minutes before any demo:

    python warm_before_demo.py            # warm everything
    python warm_before_demo.py --chat     # also fire one real Nayak chat turn
                                          # (costs 1 Gemini request — verifies
                                          # the whole agent loop end to end)

Pure standard library — no pip installs needed, runs on any Python 3.

Why this exists (free-tier reality, not a bug):
  - The HF Space (classifier) sleeps/restarts; after every container start the
    FIRST currency request pays EasyOCR warm-up and can 500 at the proxy.
  - Render free tier spins the police backend down after ~15 min idle; the
    first request pays a ~30-60s cold boot.
  This script wakes both, forces the classifier's OCR path warm, and verifies
  every service is actually answering before a judge ever touches the app.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

CLASSIFIER = "https://hikity-kawach-classifier.hf.space"
POLICE = "https://kawach-police.onrender.com"
WARM_IMAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "Classifier", "test", "fake2.jpg")

OK = "[ OK ]"
WAIT = "[WAIT]"
FAIL = "[FAIL]"


def http_get_json(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "kawach-warmup"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, json.loads(r.read().decode("utf-8", "replace"))


def http_post_json(url, payload, headers=None, timeout=60):
    body = json.dumps(payload).encode()
    h = {"Content-Type": "application/json", "User-Agent": "kawach-warmup"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, json.loads(r.read().decode("utf-8", "replace"))


def http_post_file(url, filepath, timeout=150):
    """Minimal multipart/form-data upload (stdlib only)."""
    boundary = uuid.uuid4().hex
    with open(filepath, "rb") as f:
        filedata = f.read()
    name = os.path.basename(filepath)
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{name}"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + filedata + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": "kawach-warmup",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, json.loads(r.read().decode("utf-8", "replace"))


def poll(label, fn, attempts, delay):
    """Retry fn() until it returns a truthy detail string; honest fail after attempts."""
    for i in range(1, attempts + 1):
        detail = None
        try:
            detail = fn()
            if detail:
                print(f"{OK} {label}: {detail}")
                return True
        except urllib.error.HTTPError as e:
            detail = f"HTTP {e.code} (service waking up)"
        except Exception as e:
            detail = f"{type(e).__name__} (service waking up)"
        print(f"{WAIT} {label}: waiting... attempt {i}/{attempts} ({detail or 'not ready'}), retry in {delay}s")
        time.sleep(delay)
    print(f"{FAIL} {label}: still not ready after {attempts} attempts")
    return False


def classifier_health():
    status, j = http_get_json(f"{CLASSIFIER}/health")
    if status == 200 and j.get("status") == "ok":
        return f"READY (deepfake={j.get('deepfake_mode')}, currency={j.get('currency_mode')})"
    return None


def classifier_currency_warm():
    """One real currency request — forces EasyOCR fully warm so the first
    demo upload is fast instead of eating the cold-start 500."""
    if not os.path.exists(WARM_IMAGE):
        raise RuntimeError(f"warm image missing: {WARM_IMAGE}")
    status, j = http_post_file(f"{CLASSIFIER}/classify-currency", WARM_IMAGE)
    if status == 200 and "verdict" in j:
        return f"READY — verdict={j['verdict']} in {j.get('processing_time_ms', '?')}ms, OCR is warm"
    return None


def police_root():
    status, _ = http_get_json(f"{POLICE}/", timeout=90)
    if status == 200:
        return "READY"
    return None


def police_gemini_env():
    status, j = http_get_json(f"{POLICE}/api/nayak/_debug_env")
    if status == 200:
        if j.get("gemini_key_present"):
            return f"READY — Gemini key loaded (model {j.get('gemini_model')})"
        raise RuntimeError("GEMINI_API_KEY NOT SET on Render!")
    return None


def nayak_chat_ping():
    status, j = http_post_json(
        f"{POLICE}/api/nayak/chat",
        {"message": "hi", "session_id": None},
        headers={"X-User-Id": "demo-warmup"},
        timeout=60,
    )
    if status == 200 and j.get("message", {}).get("content"):
        return f"READY — agent replied ({len(j['message']['content'])} chars)"
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chat", action="store_true",
                    help="also run one real Nayak chat turn (uses 1 Gemini request)")
    args = ap.parse_args()

    print("=" * 62)
    print("  KAWACH DEMO WARM-UP — waking free-tier services")
    print("  (HF Space can take 5-10 min if asleep — this is normal)")
    print("=" * 62 + "\n")
    results = []

    # Classifier can take 5-10 min if the Space is rebuilding/asleep
    results.append(poll("Classifier (HF Space)", classifier_health, attempts=30, delay=20))
    if results[-1]:
        results.append(poll("Currency + OCR warm-up", classifier_currency_warm,
                            attempts=8, delay=20))
    else:
        results.append(False)

    results.append(poll("Police backend (Render)", police_root, attempts=10, delay=15))
    if results[-1]:
        results.append(poll("Gemini key on Render", police_gemini_env, attempts=3, delay=5))
        if args.chat:
            results.append(poll("Nayak chat round-trip", nayak_chat_ping, attempts=3, delay=10))

    print("\n" + "=" * 62)
    if all(results):
        print(f"{OK} ALL SYSTEMS WARM & READY — demo away!")
        print("       Services stay warm ~15 min; re-run if the demo slips.")
        print("=" * 62)
        sys.exit(0)
    print(f"{FAIL} SOMETHING IS NOT READY — scroll up, fix it BEFORE demoing.")
    print("=" * 62)
    sys.exit(1)


if __name__ == "__main__":
    main()
