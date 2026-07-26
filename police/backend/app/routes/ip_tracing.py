"""
IP Infrastructure Tracing & Risk Scoring.

Adapted from the CyberShield-AI ip-tracing module into KAWACH's own stack —
the ET PS bullet asks for "device fingerprints and account linkages" mapped
across jurisdictions; this is the IP/ASN half of that (network.py already
covers phone/account/device-graph linkage).

Every source here is free and keyless by default:
  - ip-api.com            geolocation + ASN/ISP org (no key, ~45 req/min)
  - check.torproject.org  known Tor exit-node list (no key, cached 1h)
  - rdap.org              registry ownership: CIDR, abuse contact, hosting flag
  - internal telemetry    how many times KAWACH itself has looked this IP up
                          (our own DB — the one signal no external API has)

AbuseIPDB / GreyNoise reputation feeds are wired in but OPTIONAL: without
ABUSEIPDB_API_KEY / GREYNOISE_API_KEY set, that source reports
"not_configured" honestly rather than being silently skipped or faked —
same degrade-visibly pattern as the Classifier's /health endpoint.

Scoring is a deterministic weighted sum with a full breakdown returned
alongside the score — no black box, same fusion style as digital_arrest.py.
"""

import ipaddress
import os
import re
import time
from datetime import datetime
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user_claims
from app.database import get_db
from app.models import AuditLog, IPSighting, IPWatchlistEntry, Phone, TelecomCDR

router = APIRouter()

# ── Scoring weights (mirrors CyberShield-AI's scoringWeights.json) ─────────
WEIGHTS = {
    "tor_exit": 80,
    "proxy": 40,
    "hosting_provider": 20,
    "abuseipdb_score_multiplier": 0.5,
    "greynoise_malicious": 80,
    "greynoise_benign": -20,
    "internal_telemetry_threshold": 3,
    "internal_telemetry_penalty": 20,
    "case_match_offender": 50,
}

HOSTING_KEYWORDS = [
    "digitalocean", "amazon", "google", "ovh", "hetzner", "linode", "akamai",
    "cloudflare", "fastly", "azure", "datacenter", "data center", "hosting", "aws", "microsoft",
]
ISP_KEYWORDS = [
    "comcast", "at&t", "verizon", "spectrum", "centurylink", "vodafone",
    "telecom", "isp", "airtel", "jio", "bsnl", "act fibernet", "railwire",
]

# ── Tiny in-memory TTL cache (mirrors cache.service.ts) ─────────────────────
_CACHE: dict = {}


def _cache_get(key: str):
    item = _CACHE.get(key)
    if not item:
        return None
    value, expiry = item
    if time.time() > expiry:
        _CACHE.pop(key, None)
        return None
    return value


def _cache_set(key: str, value, ttl_seconds: int):
    _CACHE[key] = (value, time.time() + ttl_seconds)


def _tor_exit_nodes() -> set:
    cached = _cache_get("tor_exit_nodes")
    if cached is not None:
        return cached
    try:
        resp = requests.get("https://check.torproject.org/torbulkexitlist", timeout=10)
        resp.raise_for_status()
        nodes = {ip.strip() for ip in resp.text.splitlines() if ip.strip()}
    except Exception:
        nodes = set()
    _cache_set("tor_exit_nodes", nodes, 3600)
    return nodes


def _mark(status_map: dict, name: str, start: float, ok: bool, error: Optional[str] = None, not_configured: bool = False):
    if not_configured:
        status_map[name] = {"status": "not_configured", "latency_ms": 0}
        return
    status_map[name] = {
        "status": "ok" if ok else "failed",
        "latency_ms": round((time.time() - start) * 1000, 1),
        **({"error": error} if error else {}),
    }


def _enrich_geo_asn(ip: str, status_map: dict):
    """ip-api's free tier includes more than plain geolocation: `mobile`,
    `proxy`, and `hosting` are native security flags (no key needed), and
    `reverse` is a free reverse-DNS/PTR lookup — a hostname like
    `123.45.67.89.static.somehost.com` or `vps-1234.ovh.net` often tells you
    more about the line than the ASN org name alone."""
    start = time.time()
    try:
        resp = requests.get(
            f"http://ip-api.com/json/{ip}",
            params={
                "fields": (
                    "status,message,country,countryCode,region,regionName,city,district,"
                    "zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query"
                ),
                "lang": "en",
            },
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "success":
            raise ValueError(data.get("message", "ip-api lookup failed"))

        accuracy_km = 25 if data.get("city") else (150 if data.get("regionName") else 500)
        geo = {
            "country": data.get("countryCode") or data.get("country") or "Unknown",
            "city": data.get("city") or "Unknown",
            "district": data.get("district") or None,
            "region": data.get("regionName"),
            "zip": data.get("zip") or None,
            "timezone": data.get("timezone") or None,
            "lat": data.get("lat") or 0,
            "lon": data.get("lon") or 0,
            "accuracy_km": accuracy_km,
            "accuracy_label": "High" if accuracy_km <= 50 else ("Medium" if accuracy_km <= 200 else "Low"),
            "geo_source": "ip-api.com",
        }

        asn = None
        org = data.get("isp") or data.get("org")
        if org:
            number = 0
            m = re.match(r"^AS(\d+)", data.get("as") or "", re.I)
            if m:
                number = int(m.group(1))
            asn = {"number": number, "org": org, "asname": data.get("asname") or None}

        native_flags = {
            "is_mobile": bool(data.get("mobile")),
            "is_proxy": bool(data.get("proxy")),
            "is_hosting_native": bool(data.get("hosting")),
        }
        reverse_dns = data.get("reverse") or None

        _mark(status_map, "ip-api", start, True)
        return geo, asn, native_flags, reverse_dns
    except Exception as e:
        _mark(status_map, "ip-api", start, False, str(e))
        return None, None, {}, None


def _enrich_tor(ip: str, status_map: dict) -> bool:
    start = time.time()
    try:
        is_tor = ip in _tor_exit_nodes()
        _mark(status_map, "tor-exit-list", start, True)
        return is_tor
    except Exception as e:
        _mark(status_map, "tor-exit-list", start, False, str(e))
        return False


def _enrich_rdap(ip: str, status_map: dict) -> Optional[dict]:
    start = time.time()
    try:
        resp = requests.get(
            f"https://rdap.org/ip/{ip}",
            headers={"Accept": "application/rdap+json"},
            timeout=8,  # rdap.org redirects to the regional registry (ARIN/RIPE/APNIC...); allow for the extra hop
        )
        resp.raise_for_status()
        data = resp.json()

        name = (data.get("name") or "").lower()
        entities = data.get("entities") or []
        is_hosting = any(kw in name for kw in HOSTING_KEYWORDS)
        if not is_hosting:
            blob = str(entities).lower()
            is_hosting = any(kw in blob for kw in HOSTING_KEYWORDS)

        cidr = "Not available"
        cidrs = data.get("cidr0_cidrs") or []
        if cidrs:
            c = cidrs[0]
            cidr = f"{c.get('v4prefix') or c.get('v6prefix') or ''}/{c.get('length', '')}"
        elif data.get("startAddress") and data.get("endAddress"):
            cidr = f"{data['startAddress']} - {data['endAddress']}"

        allocation_date = "Not available"
        for ev in data.get("events") or []:
            if ev.get("eventAction") in ("registration", "last changed", "transfer"):
                allocation_date = ev.get("eventDate", allocation_date)
                break

        abuse_contact = "Not available"
        for ent in entities:
            if "abuse" in (ent.get("roles") or []):
                vcard = (ent.get("vcardArray") or [None, []])[1]
                for prop in vcard:
                    if prop and prop[0] == "email":
                        abuse_contact = prop[3]
                        break

        _mark(status_map, "rdap", start, True)
        return {
            "is_hosting": is_hosting,
            "cidr": cidr,
            "abuse_contact": abuse_contact,
            "allocation_date": allocation_date,
            "registration_country": data.get("country", "Not available"),
        }
    except Exception as e:
        _mark(status_map, "rdap", start, False, str(e))
        return None


def _enrich_reputation(ip: str, status_map: dict) -> dict:
    reputation = {}

    abuse_key = os.getenv("ABUSEIPDB_API_KEY")
    if abuse_key:
        start = time.time()
        try:
            resp = requests.get(
                "https://api.abuseipdb.com/api/v2/check",
                params={"ipAddress": ip, "maxAgeInDays": 90},
                headers={"Key": abuse_key, "Accept": "application/json"},
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            reputation["abuseipdb_score"] = data.get("abuseConfidenceScore", 0)
            reputation["abuseipdb_reports"] = data.get("totalReports", 0)
            _mark(status_map, "AbuseIPDB", start, True)
        except Exception as e:
            _mark(status_map, "AbuseIPDB", start, False, str(e))
    else:
        _mark(status_map, "AbuseIPDB", 0, False, not_configured=True)

    greynoise_key = os.getenv("GREYNOISE_API_KEY")
    if greynoise_key:
        start = time.time()
        try:
            resp = requests.get(
                f"https://api.greynoise.io/v3/community/{ip}",
                headers={"key": greynoise_key, "Accept": "application/json"},
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json()
            reputation["greynoise_classification"] = data.get("classification", "unknown")
            _mark(status_map, "GreyNoise", start, True)
        except Exception as e:
            _mark(status_map, "GreyNoise", start, False, str(e))
    else:
        _mark(status_map, "GreyNoise", 0, False, not_configured=True)

    return reputation


def _classify_asn(asn: Optional[dict]) -> Optional[dict]:
    if not asn or not asn.get("org"):
        return asn
    org = asn["org"].lower()
    if any(kw in org for kw in HOSTING_KEYWORDS):
        asn["type"] = "hosting"
    elif any(kw in org for kw in ISP_KEYWORDS):
        asn["type"] = "isp"
    else:
        asn["type"] = "unknown"
    return asn


def _internal_case_match(db: Session, ip: str) -> Optional[dict]:
    """
    No external API — free or paid — can ever turn a bare IP into a person's
    name; that mapping lives only in the ISP's private subscriber records and
    legally requires a subpoena. What we CAN do honestly is check whether
    this IP has shown up in KAWACH's own case data: network.py synthesizes a
    demo IP per TelecomCDR row as f"103.85.12.{hash(record.id) % 254 + 1}" to
    represent "device logged in from" in the offender graph. Mirror that
    exact formula here so a traced IP that matches one of our own case
    records surfaces the linked offender — the same "is this already in our
    database" signal fraud_shield.py uses for phone numbers.
    """
    if not ip.startswith("103.85.12."):
        return None  # not one of our synthesized demo IPs — nothing to match

    for record in db.query(TelecomCDR).all():
        synthesized = f"103.85.12.{hash(record.id) % 254 + 1}"
        if synthesized != ip:
            continue
        phone = db.query(Phone).filter(Phone.phone_number == record.phone_number).first()
        if not phone or not phone.owner:
            continue
        owner = phone.owner
        return {
            "matched": True,
            "offender_id": owner.id,
            "offender_name": owner.name,
            "risk_score": owner.risk_score,
            "gangs": [g.name for g in owner.gangs],
            "phone_number": record.phone_number,
            "device_imei": record.imei,
            "cell_tower_id": record.cell_tower_id,
            "cdr_timestamp": record.timestamp.isoformat() if record.timestamp else None,
        }
    return None


def _internal_telemetry(db: Session, ip: str) -> dict:
    row = db.query(IPSighting).filter(IPSighting.ip == ip).first()
    now = datetime.utcnow()
    if row:
        row.lookup_count += 1
        row.last_seen = now
    else:
        row = IPSighting(ip=ip, lookup_count=1, first_seen=now, last_seen=now)
        db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "kawach_lookup_count": row.lookup_count,
        "first_seen": row.first_seen.isoformat(),
        "last_seen": row.last_seen.isoformat(),
    }


def _score(entity: dict) -> dict:
    score = 0.0
    breakdown = []

    flags = entity.get("network_flags") or {}
    if flags.get("is_tor"):
        score += WEIGHTS["tor_exit"]
        breakdown.append({
            "indicator": "IP is a known Tor exit node",
            "points": WEIGHTS["tor_exit"], "category": "network_flags",
        })
    if flags.get("is_proxy"):
        score += WEIGHTS["proxy"]
        breakdown.append({
            "indicator": "IP is a known VPN/proxy/anonymizer (ip-api security flag)",
            "points": WEIGHTS["proxy"], "category": "network_flags",
        })
    if flags.get("is_hosting"):
        score += WEIGHTS["hosting_provider"]
        breakdown.append({
            "indicator": "IP belongs to a hosting/cloud provider, not a residential ISP line",
            "points": WEIGHTS["hosting_provider"], "category": "network_flags",
        })

    rep = entity.get("reputation") or {}
    if rep.get("abuseipdb_score"):
        pts = round(rep["abuseipdb_score"] * WEIGHTS["abuseipdb_score_multiplier"], 1)
        score += pts
        breakdown.append({
            "indicator": f"AbuseIPDB confidence score is {rep['abuseipdb_score']}%",
            "points": pts, "category": "reputation",
        })
    if rep.get("greynoise_classification") == "malicious":
        score += WEIGHTS["greynoise_malicious"]
        breakdown.append({
            "indicator": "GreyNoise classified this IP as malicious (mass scanner/actor)",
            "points": WEIGHTS["greynoise_malicious"], "category": "reputation",
        })
    elif rep.get("greynoise_classification") == "benign":
        score += WEIGHTS["greynoise_benign"]
        breakdown.append({
            "indicator": "GreyNoise classified this IP as benign",
            "points": WEIGHTS["greynoise_benign"], "category": "reputation",
        })

    internal = entity.get("internal") or {}
    if internal.get("kawach_lookup_count", 0) >= WEIGHTS["internal_telemetry_threshold"]:
        score += WEIGHTS["internal_telemetry_penalty"]
        breakdown.append({
            "indicator": f"This IP has surfaced in {internal['kawach_lookup_count']} KAWACH lookups — repeat appearance across cases",
            "points": WEIGHTS["internal_telemetry_penalty"], "category": "internal",
        })

    case_match = entity.get("case_match")
    if case_match and case_match.get("matched"):
        score += WEIGHTS["case_match_offender"]
        breakdown.append({
            "indicator": f"IP is linked to registered offender {case_match['offender_name']} ({case_match['offender_id']}) in KAWACH's own case records",
            "points": WEIGHTS["case_match_offender"], "category": "internal",
        })

    score = max(0, min(100, round(score)))

    status_map = entity.get("source_status") or {}
    failed = sum(1 for s in status_map.values() if s["status"] in ("failed", "timeout"))
    reputation_sources = ["AbuseIPDB", "GreyNoise"]
    reputation_unavailable = sum(
        1 for name in reputation_sources
        if status_map.get(name, {}).get("status") in ("failed", "timeout", "not_configured")
    )
    if failed >= 3 or reputation_unavailable == len(reputation_sources):
        confidence = "low"
    elif failed >= 1:
        confidence = "medium"
    else:
        confidence = "high"

    entity["risk_score"] = score
    entity["score_breakdown"] = breakdown
    entity["confidence"] = confidence
    return entity


class ListRequest(BaseModel):
    list_type: str  # 'watchlist' | 'blocklist'
    note: Optional[str] = None


@router.get("/watchlist/all")
def list_watchlist(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    rows = (
        db.query(IPWatchlistEntry)
        .order_by(IPWatchlistEntry.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": r.id, "ip": r.ip, "list_type": r.list_type, "note": r.note,
            "added_by": r.added_by, "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/{ip}")
def get_risk_profile(ip: str, db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    try:
        ipaddress.ip_address(ip)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address format")

    status_map: dict = {}
    geo, asn, native_flags, reverse_dns = _enrich_geo_asn(ip, status_map)
    is_tor = _enrich_tor(ip, status_map)
    rdap = _enrich_rdap(ip, status_map)
    reputation = _enrich_reputation(ip, status_map)
    internal = _internal_telemetry(db, ip)
    case_match = _internal_case_match(db, ip)

    asn = _classify_asn(asn)

    network_flags = {
        "is_tor": is_tor,
        "is_proxy": native_flags.get("is_proxy", False),
        "is_mobile": native_flags.get("is_mobile", False),
    }
    network_ownership = None
    if rdap:
        network_flags["is_hosting"] = rdap["is_hosting"]
        network_ownership = {k: v for k, v in rdap.items() if k != "is_hosting"}
    # RDAP (registry lookup) can time out on some hosts; ip-api's native
    # `hosting` flag and the ASN org string are two independent ways to
    # still catch a hosting/cloud IP when RDAP is slow — OR them in rather
    # than losing the flag.
    if native_flags.get("is_hosting_native") or (asn and asn.get("type") == "hosting"):
        network_flags["is_hosting"] = True
    if reverse_dns:
        network_ownership = {**(network_ownership or {}), "reverse_dns": reverse_dns}

    entity = {
        "ip": ip,
        "geo": geo,
        "asn": asn,
        "network_flags": network_flags,
        "network_ownership": network_ownership,
        "reputation": reputation,
        "internal": internal,
        "case_match": case_match,
        "source_status": status_map,
        "last_checked": datetime.utcnow().isoformat(),
    }
    entity = _score(entity)

    watch_row = (
        db.query(IPWatchlistEntry)
        .filter(IPWatchlistEntry.ip == ip)
        .order_by(IPWatchlistEntry.created_at.desc())
        .first()
    )
    entity["watchlist_entry"] = (
        {
            "list_type": watch_row.list_type, "note": watch_row.note,
            "added_by": watch_row.added_by, "created_at": watch_row.created_at.isoformat(),
        }
        if watch_row else None
    )

    db.add(AuditLog(
        username=claims.get("username", "officer"),
        role=claims.get("role", "Officer"),
        action="IP_RISK_LOOKUP",
        details={"ip": ip, "risk_score": entity["risk_score"]},
        ip_address="10.25.0.1",
    ))
    db.commit()

    return entity


@router.post("/{ip}/list")
def add_to_list(
    ip: str, req: ListRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    try:
        ipaddress.ip_address(ip)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address format")
    if req.list_type not in ("watchlist", "blocklist"):
        raise HTTPException(status_code=400, detail="list_type must be 'watchlist' or 'blocklist'")

    entry = IPWatchlistEntry(
        ip=ip, list_type=req.list_type, note=req.note,
        added_by=claims.get("username", "officer"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id, "ip": entry.ip, "list_type": entry.list_type,
        "note": entry.note, "added_by": entry.added_by,
        "created_at": entry.created_at.isoformat(),
    }
