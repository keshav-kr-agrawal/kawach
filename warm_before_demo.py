"""
KAWACH pre-demo warm-up. Run this ~10 minutes before any demo:

    python warm_before_demo.py            # warm everything
    python warm_before_demo.py --chat     # also fire one real Nayak chat turn
                                          # (costs 1 Gemini request — verifies
                                          # the whole agent loop end to end)

Why this exists (free-tier reality, not a bug):
  - The HF Space (classifier) sleeps/restarts; after every container start the
    FIRST currency request pays EasyOCR warm-up and can 500 at the proxy.
  - Render free tier spins the police backend down after ~15 min idle; the
    first request pays a ~30-60s cold boot.
  This script wakes both, forces the classifier's OCR path warm, and verifies
  every service is actually answering before a judge ever touches the app.
"""

import argparse
import os
import sys
import time

import requests

CLASSIFIER = "https://hikity-kawach-classifier.hf.space"
POLICE = "https://kawach-police.onrender.com"
WARM_IMAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "Classifier", "test", "fake2.jpg")

OK = "[ OK ]"
WAIT = "[WAIT]"
FAIL = "[FAIL]"


def poll(label, fn, attempts, delay):
    """Retry fn() until it returns a truthy detail string; honest fail after attempts."""
    for i in range(1, attempts + 1):
        try:
            detail = fn()
            if detail:
                print(f"{OK} {label}: {detail}")
                return True
        except Exception as e:
            detail = f"{type(e).__name__}"
        print(f"{WAIT} {label}: attempt {i}/{attempts} ({detail or 'not ready'}), retrying in {delay}s")
        time.sleep(delay)
    print(f"{FAIL} {label}: still not ready after {attempts} attempts")
    return False


def classifier_health():
    r = requests.get(f"{CLASSIFIER}/health", timeout=30)
    if r.status_code == 200 and r.json().get("status") == "ok":
        j = r.json()
        return f"up (deepfake={j.get('deepfake_mode')}, currency={j.get('currency_mode')})"
    return None


def classifier_currency_warm():
    """One real currency request — forces EasyOCR fully warm so the first
    demo upload is fast instead of eating the cold-start 500."""
    if not os.path.exists(WARM_IMAGE):
        raise RuntimeError(f"warm image missing: {WARM_IMAGE}")
    with open(WARM_IMAGE, "rb") as f:
        r = requests.post(f"{CLASSIFIER}/classify-currency",
                          files={"file": ("warm.jpg", f, "image/jpeg")}, timeout=150)
    if r.status_code == 200 and "verdict" in r.json():
        j = r.json()
        return f"verdict={j['verdict']} in {j.get('processing_time_ms', '?')}ms — OCR is warm"
    return None


def police_root():
    r = requests.get(f"{POLICE}/", timeout=90)
    if r.status_code == 200:
        return "up"
    return None


def police_gemini_env():
    r = requests.get(f"{POLICE}/api/nayak/_debug_env", timeout=30)
    if r.status_code == 200:
        j = r.json()
        if j.get("gemini_key_present"):
            return f"Gemini key loaded (model {j.get('gemini_model')})"
        raise RuntimeError("GEMINI_API_KEY NOT SET on Render!")
    return None


def nayak_chat_ping():
    r = requests.post(f"{POLICE}/api/nayak/chat",
                      headers={"Content-Type": "application/json", "X-User-Id": "demo-warmup"},
                      json={"message": "hi", "session_id": None}, timeout=60)
    if r.status_code == 200 and r.json().get("message", {}).get("content"):
        return f"agent replied ({len(r.json()['message']['content'])} chars)"
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chat", action="store_true",
                    help="also run one real Nayak chat turn (uses 1 Gemini request)")
    args = ap.parse_args()

    print("KAWACH demo warm-up — waking free-tier services...\n")
    results = []

    # Classifier can take 5-10 min if the Space is rebuilding/asleep
    results.append(poll("Classifier health", classifier_health, attempts=30, delay=20))
    if results[-1]:
        results.append(poll("Classifier currency+OCR warm", classifier_currency_warm,
                            attempts=8, delay=20))
    else:
        results.append(False)

    results.append(poll("Police backend (Render)", police_root, attempts=10, delay=15))
    if results[-1]:
        results.append(poll("Gemini key on Render", police_gemini_env, attempts=3, delay=5))
        if args.chat:
            results.append(poll("Nayak chat round-trip", nayak_chat_ping, attempts=3, delay=10))

    print()
    if all(results):
        print(f"{OK} ALL SYSTEMS WARM — demo away. Services stay warm ~15 min; "
              f"re-run this if the demo slips.")
        sys.exit(0)
    print(f"{FAIL} Something is NOT ready — scroll up, fix it BEFORE demoing.")
    sys.exit(1)


if __name__ == "__main__":
    main()
