from fastapi import APIRouter, Depends
from typing import List, Optional
import networkx as nx
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_datetime
from app.ml.features import get_station_district_map

router = APIRouter()

# The final render is capped at 120 nodes anyway (see below) — for an
# unscoped DGP query over the whole state's accused roster, pre-limiting to
# the top N by risk_score avoids building relationship maps for everyone in
# the state before throwing most of the result away. SP/SHO/Constable
# queries are already bounded by district/station.
DGP_OFFENDER_SCAN_LIMIT = 300


@router.get("/graph")
def get_network_graph(min_weight: int = 1, db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    role = claims.get("role")
    station_to_district = get_station_district_map(db)
    cases = zcql_rows(db, "CaseMaster")
    case_by_id = {c["CaseMasterID"]: c for c in cases if c.get("CaseMasterID") is not None}

    # 1. Gather filtered list of Accused based on role boundaries. The old
    # schema's Offender<->FIRRecord was many-to-many; Accused here has a
    # single CaseMasterID, so role scoping goes through that one case.
    accused = zcql_rows(db, "Accused")

    def _in_scope(a: dict) -> bool:
        case = case_by_id.get(a.get("CaseMasterID"))
        if not case:
            return False
        if role == "SP":
            return station_to_district.get(case.get("PoliceStationID")) == claims.get("district_id")
        if role in ("SHO", "Constable"):
            return case.get("PoliceStationID") == claims.get("station_id")
        return True

    accused = [a for a in accused if _in_scope(a)]
    if role not in ("SP", "SHO", "Constable"):
        accused.sort(key=lambda a: a.get("risk_score", 0) or 0, reverse=True)
        accused = accused[:DGP_OFFENDER_SCAN_LIMIT]

    accused_ids = {a["AccusedMasterID"] for a in accused if a.get("AccusedMasterID") is not None}

    vehicles = [v for v in zcql_rows(db, "Vehicle") if v.get("owner_offender_id") in accused_ids]
    phones = [p for p in zcql_rows(db, "Phone") if p.get("owner_offender_id") in accused_ids]
    accounts = [ac for ac in zcql_rows(db, "Account") if ac.get("owner_offender_id") in accused_ids]

    phones_by_owner: dict = {}
    for p in phones:
        phones_by_owner.setdefault(p["owner_offender_id"], []).append(p)
    vehicles_by_owner: dict = {}
    for v in vehicles:
        vehicles_by_owner.setdefault(v["owner_offender_id"], []).append(v)
    accounts_by_owner: dict = {}
    for ac in accounts:
        accounts_by_owner.setdefault(ac["owner_offender_id"], []).append(ac)

    all_phone_numbers = [p["phone_number"] for p in phones]
    cdr_by_phone: dict = {}
    if all_phone_numbers:
        for record in zcql_rows(db, "TelecomCDR"):
            if record.get("phone_number") in all_phone_numbers:
                cdr_by_phone.setdefault(record["phone_number"], []).append(record)

    nodes_res = []
    links_res = []

    for o in accused:
        oid = o.get("AccusedMasterID")
        name = o.get("AccusedName") or f"Accused {oid}"
        risk = o.get("risk_score", 0) or 0
        priors = o.get("num_prior_offenses", 0) or 0

        nodes_res.append({
            "id": oid,
            "label": name,
            "type": "Person",
            "risk_score": risk,
            "priors": priors,
        })

        for veh in vehicles_by_owner.get(oid, []):
            veh_node_id = f"veh_{veh['plate_number']}"
            if not any(n["id"] == veh_node_id for n in nodes_res):
                nodes_res.append({
                    "id": veh_node_id,
                    "label": f"{veh.get('make', '')} {veh.get('model', '')} ({veh['plate_number']})",
                    "type": "Vehicle",
                })
            links_res.append({"source": oid, "target": veh_node_id, "type": "Owned"})

        for ph in phones_by_owner.get(oid, []):
            ph_node_id = f"ph_{ph['phone_number']}"
            if not any(n["id"] == ph_node_id for n in nodes_res):
                nodes_res.append({"id": ph_node_id, "label": ph["phone_number"], "type": "Phone"})
            links_res.append({"source": oid, "target": ph_node_id, "type": "Owned"})

            cdr_records = cdr_by_phone.get(ph["phone_number"], [])[:2]
            for record in cdr_records:
                if record.get("imei"):
                    imei_node_id = f"imei_{record['imei']}"
                    if not any(n["id"] == imei_node_id for n in nodes_res):
                        nodes_res.append({"id": imei_node_id, "label": record["imei"], "type": "Device IMEI"})
                    links_res.append({"source": ph_node_id, "target": imei_node_id, "type": "Used Device"})

                ip_label = f"103.85.12.{hash(record.get('id')) % 254 + 1}"
                ip_node_id = f"ip_{ip_label}"
                if not any(n["id"] == ip_node_id for n in nodes_res):
                    nodes_res.append({"id": ip_node_id, "label": ip_label, "type": "IP Address"})
                links_res.append({"source": ph_node_id, "target": ip_node_id, "type": "LOGGED_IN_FROM"})

            if risk > 80:
                links_res.append({
                    "source": oid, "target": ph_node_id, "type": "USED_VOICE_CLONE",
                    "details": "Simulated deepfake threat signature detected in emergency logs",
                })

        for acc in accounts_by_owner.get(oid, []):
            acc_node_id = f"acc_{acc['account_number']}"
            if not any(n["id"] == acc_node_id for n in nodes_res):
                nodes_res.append({"id": acc_node_id, "label": f"{acc.get('bank_name', '')} {acc['account_number']}", "type": "Account"})
            links_res.append({"source": oid, "target": acc_node_id, "type": "Owned"})

            upi_label = f"{name.lower().replace(' ', '')}@okaxis"
            upi_node_id = f"upi_{acc['account_number']}"
            if not any(n["id"] == upi_node_id for n in nodes_res):
                nodes_res.append({"id": upi_node_id, "label": upi_label, "type": "UPI ID"})
            links_res.append({"source": acc_node_id, "target": upi_node_id, "type": "TRANSFERRED_TO"})

            crypto_label = f"0x71c...{acc['account_number'][-4:]}"
            crypto_node_id = f"crypto_{acc['account_number']}"
            if not any(n["id"] == crypto_node_id for n in nodes_res):
                nodes_res.append({"id": crypto_node_id, "label": crypto_label, "type": "Crypto Wallet"})
            links_res.append({"source": acc_node_id, "target": crypto_node_id, "type": "TRANSFERRED_TO"})

    # Calls between seeded phone nodes in scope
    phone_numbers = {n["id"].replace("ph_", "") for n in nodes_res if n["type"] == "Phone"}
    if phone_numbers:
        for call in zcql_rows(db, "Call"):
            if call.get("caller_phone") in phone_numbers or call.get("receiver_phone") in phone_numbers:
                ts = parse_datetime(call.get("timestamp"))
                links_res.append({
                    "source": f"ph_{call.get('caller_phone')}",
                    "target": f"ph_{call.get('receiver_phone')}",
                    "type": "Called",
                    "details": f"{call.get('duration_seconds')} sec on {ts.strftime('%Y-%m-%d') if ts else '?'}",
                })

    # Locations visited
    locations_by_id = {loc["id"]: loc for loc in zcql_rows(db, "Location") if loc.get("id")}
    for v in zcql_rows(db, "Visit"):
        if v.get("offender_id") not in accused_ids:
            continue
        loc_node_id = f"loc_{v.get('location_id')}"
        loc = locations_by_id.get(v.get("location_id"))
        if loc and not any(n["id"] == loc_node_id for n in nodes_res):
            nodes_res.append({"id": loc_node_id, "label": loc.get("name"), "type": "Location", "lat": loc.get("lat"), "lng": loc.get("lng")})
        links_res.append({"source": v.get("offender_id"), "target": loc_node_id, "type": "Visited"})

    # Co-accused in the same case — the schema's Accused row carries a single
    # CaseMasterID (not the old many-to-many fir_accused junction table), so
    # "Arrested With" is just: which Accused rows share a CaseMasterID. This
    # is also the closest equivalent to the old Offender.associates concept,
    # which has no surviving table in the Zoho-prescribed schema.
    case_accused_map: dict = {}
    for a in accused:
        case_accused_map.setdefault(a.get("CaseMasterID"), []).append(a.get("AccusedMasterID"))
    for case_id, ids in case_accused_map.items():
        if len(ids) > 1:
            case = case_by_id.get(case_id, {})
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    links_res.append({
                        "source": ids[i], "target": ids[j], "type": "Arrested With",
                        "details": f"Case: {case_id} (CaseCategoryID {case.get('CaseCategoryID')})",
                    })

    # Limit nodes to 120 max for optimal rendering performance
    if len(nodes_res) > 120:
        nodes_res = sorted(
            nodes_res,
            key=lambda x: (0 if x["type"] == "Person" else 1, -(x.get("risk_score", 0) or 0)),
        )[:120]
        nodes_ids = {n["id"] for n in nodes_res}
        links_res = [l for l in links_res if l["source"] in nodes_ids and l["target"] in nodes_ids]

    # ── Fraud-ring intelligence: Louvain communities + centrality + mule flags ──
    communities_meta = []
    if nodes_res and links_res:
        G = nx.Graph()
        G.add_nodes_from(n["id"] for n in nodes_res)
        G.add_edges_from((l["source"], l["target"]) for l in links_res if l["source"] != l["target"])

        communities = nx.community.louvain_communities(G, seed=42)
        community_of = {}
        for cid, members in enumerate(communities):
            for node_id in members:
                community_of[node_id] = cid

        betweenness = nx.betweenness_centrality(G)
        degree_cent = nx.degree_centrality(G)

        node_by_id = {n["id"]: n for n in nodes_res}
        community_max_risk = {}
        for node_id, cid in community_of.items():
            risk = node_by_id.get(node_id, {}).get("risk_score", 0) or 0
            community_max_risk[cid] = max(community_max_risk.get(cid, 0), risk)

        for n in nodes_res:
            cid = community_of.get(n["id"])
            n["community_id"] = cid
            n["betweenness_centrality"] = round(betweenness.get(n["id"], 0.0), 4)
            n["degree_centrality"] = round(degree_cent.get(n["id"], 0.0), 4)

            n["mule_flag"] = False
            if (
                n["type"] == "Person"
                and (n.get("priors") or 0) <= 1
                and (n.get("risk_score") or 0) < 50
                and cid is not None
                and community_max_risk.get(cid, 0) >= 70
                and G.degree(n["id"]) >= 2
            ):
                n["mule_flag"] = True
                broker_note = (
                    f", brokers cross-network paths (betweenness {betweenness[n['id']]:.3f})"
                    if betweenness.get(n["id"], 0.0) > 0 else ""
                )
                n["mule_reason"] = (
                    f"Low criminal history ({n.get('priors') or 0} priors) but holds "
                    f"{G.degree(n['id'])} ties inside a network containing offenders with "
                    f"risk up to {community_max_risk[cid]:.0f}%{broker_note} — consistent "
                    f"with a money-mule/intermediary role."
                )

        mule_person_ids = {n["id"] for n in nodes_res if n.get("mule_flag")}
        for l in links_res:
            if l["source"] in mule_person_ids and l["type"] == "Owned":
                owned = node_by_id.get(l["target"])
                if owned and owned["type"] in ("Account", "UPI ID", "Crypto Wallet", "Phone"):
                    owned["mule_flag"] = True
                    owned["mule_reason"] = f"Owned by suspected mule {node_by_id[l['source']]['label']}"

        for cid, members in enumerate(communities):
            person_members = [node_by_id[m] for m in members if m in node_by_id and node_by_id[m]["type"] == "Person"]
            communities_meta.append({
                "community_id": cid,
                "size": len(members),
                "person_count": len(person_members),
                "max_risk_score": round(community_max_risk.get(cid, 0), 1),
                "suspected_mules": sum(1 for m in members if node_by_id.get(m, {}).get("mule_flag")),
                "top_broker": max(members, key=lambda m: betweenness.get(m, 0.0)) if members else None,
            })

    return {
        "nodes": nodes_res,
        "links": links_res,
        "communities": communities_meta,
        "metadata": {
            "algorithm": "Louvain community detection + betweenness centrality (networkx)",
            "community_count": len(communities_meta),
            "suspected_mule_count": sum(1 for n in nodes_res if n.get("mule_flag")),
        },
    }
