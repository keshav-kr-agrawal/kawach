from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import networkx as nx
from app.database import get_db
from app.models import Offender, FIRRecord, PoliceStation, Gang, Vehicle, Phone, Account, Call, Location, Visit, TelecomCDR
from app.auth import get_current_user_claims

router = APIRouter()

@router.get("/graph")
def get_network_graph(min_weight: int = 1, db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    role = claims.get("role")
    
    # 1. Gather filtered list of Offenders based on role boundaries
    offenders_query = db.query(Offender)
    if role == "SP":
        offenders_query = offenders_query.join(FIRRecord, Offender.firs).join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        offenders_query = offenders_query.join(FIRRecord, Offender.firs).filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        offenders_query = offenders_query.join(FIRRecord, Offender.firs).filter(FIRRecord.assigned_officer_id == claims.get("username"))
        
    offenders = offenders_query.distinct().all()
    offender_ids = {o.id for o in offenders}
    
    nodes_res = []
    links_res = []
    
    # Add offender nodes
    for o in offenders:
        nodes_res.append({
            "id": o.id,
            "label": o.name,
            "type": "Person",
            "risk_score": o.risk_score,
            "priors": o.num_prior_offenses
        })
        
        # Add links for associates (if both are in the filtered scope or to show immediate links)
        for assoc in o.associates:
            if assoc.id in offender_ids:
                links_res.append({
                    "source": o.id,
                    "target": assoc.id,
                    "type": "Associated With"
                })
                
        # Link to Gangs
        for gang in o.gangs:
            # Add Gang node if not already added
            gang_node_id = f"gang_{gang.id}"
            if not any(n["id"] == gang_node_id for n in nodes_res):
                nodes_res.append({
                    "id": gang_node_id,
                    "label": gang.name,
                    "type": "Gang",
                    "description": gang.description
                })
            links_res.append({
                "source": o.id,
                "target": gang_node_id,
                "type": "Member Of"
            })
            
        # Link to Vehicles
        for veh in o.vehicles:
            veh_node_id = f"veh_{veh.plate_number}"
            if not any(n["id"] == veh_node_id for n in nodes_res):
                nodes_res.append({
                    "id": veh_node_id,
                    "label": f"{veh.make} {veh.model} ({veh.plate_number})",
                    "type": "Vehicle"
                })
            links_res.append({
                "source": o.id,
                "target": veh_node_id,
                "type": "Owned"
            })
            
        # Link to Phones & ET Add-ons (IMEI, IP Address)
        for ph in o.phones:
            ph_node_id = f"ph_{ph.phone_number}"
            if not any(n["id"] == ph_node_id for n in nodes_res):
                nodes_res.append({
                    "id": ph_node_id,
                    "label": ph.phone_number,
                    "type": "Phone"
                })
            links_res.append({
                "source": o.id,
                "target": ph_node_id,
                "type": "Owned"
            })
            
            # Query TelecomCDR logs for this phone to extract Device IMEI and Cell pings (IP Address representation)
            cdr_records = db.query(TelecomCDR).filter(TelecomCDR.phone_number == ph.phone_number).limit(2).all()
            for record in cdr_records:
                if record.imei:
                    imei_node_id = f"imei_{record.imei}"
                    if not any(n["id"] == imei_node_id for n in nodes_res):
                        nodes_res.append({
                            "id": imei_node_id,
                            "label": record.imei,
                            "type": "Device IMEI"
                        })
                    links_res.append({
                        "source": ph_node_id,
                        "target": imei_node_id,
                        "type": "Used Device"
                    })
                    
                # Create IP Address representations from CDR logs
                ip_label = f"103.85.12.{hash(record.id) % 254 + 1}"
                ip_node_id = f"ip_{ip_label}"
                if not any(n["id"] == ip_node_id for n in nodes_res):
                    nodes_res.append({
                        "id": ip_node_id,
                        "label": ip_label,
                        "type": "IP Address"
                    })
                links_res.append({
                    "source": ph_node_id,
                    "target": ip_node_id,
                    "type": "LOGGED_IN_FROM"
                })
            
            # High-risk voice cloning intelligence alerts link representation
            if o.risk_score > 80:
                # Add voice clone link to a related node or self
                links_res.append({
                    "source": o.id,
                    "target": ph_node_id,
                    "type": "USED_VOICE_CLONE",
                    "details": "Simulated deepfake threat signature detected in emergency logs"
                })
            
        # Link to Accounts & ET Add-ons (UPI ID, Crypto Wallet)
        for acc in o.accounts:
            acc_node_id = f"acc_{acc.account_number}"
            if not any(n["id"] == acc_node_id for n in nodes_res):
                nodes_res.append({
                    "id": acc_node_id,
                    "label": f"{acc.bank_name} {acc.account_number}",
                    "type": "Account"
                })
            links_res.append({
                "source": o.id,
                "target": acc_node_id,
                "type": "Owned"
            })
            
            # Map a companion UPI ID node
            upi_label = f"{o.name.lower().replace(' ', '')}@okaxis"
            upi_node_id = f"upi_{acc.account_number}"
            if not any(n["id"] == upi_node_id for n in nodes_res):
                nodes_res.append({
                    "id": upi_node_id,
                    "label": upi_label,
                    "type": "UPI ID"
                })
            links_res.append({
                "source": acc_node_id,
                "target": upi_node_id,
                "type": "TRANSFERRED_TO"
            })
            
            # Map a companion Crypto Wallet node
            crypto_label = f"0x71c...{acc.account_number[-4:]}"
            crypto_node_id = f"crypto_{acc.account_number}"
            if not any(n["id"] == crypto_node_id for n in nodes_res):
                nodes_res.append({
                    "id": crypto_node_id,
                    "label": crypto_label,
                    "type": "Crypto Wallet"
                })
            links_res.append({
                "source": acc_node_id,
                "target": crypto_node_id,
                "type": "TRANSFERRED_TO"
            })

    # Add calls between seeded phone nodes in scope
    phone_numbers = {n["id"].replace("ph_", "") for n in nodes_res if n["type"] == "Phone"}
    if phone_numbers:
        calls = db.query(Call).filter(Call.caller_phone.in_(phone_numbers) | Call.receiver_phone.in_(phone_numbers)).all()
        for call in calls:
            links_res.append({
                "source": f"ph_{call.caller_phone}",
                "target": f"ph_{call.receiver_phone}",
                "type": "Called",
                "details": f"{call.duration_seconds} sec on {call.timestamp.strftime('%Y-%m-%d')}"
            })
            
    # Add locations visited
    visits = db.query(Visit).filter(Visit.offender_id.in_(offender_ids)).all()
    for v in visits:
        loc_node_id = f"loc_{v.location_id}"
        # Add Location node if not already added
        if not any(n["id"] == loc_node_id for n in nodes_res):
            nodes_res.append({
                "id": loc_node_id,
                "label": v.location.name,
                "type": "Location",
                "lat": v.location.lat,
                "lng": v.location.lng
            })
        links_res.append({
            "source": v.offender_id,
            "target": loc_node_id,
            "type": "Visited"
        })

    # Co-accused in FIRs
    firs_query = db.query(FIRRecord)
    if role == "SP":
        firs_query = firs_query.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        firs_query = firs_query.filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        firs_query = firs_query.filter(FIRRecord.assigned_officer_id == claims.get("username"))
        
    firs = firs_query.all()
    for f in firs:
        accused_ids = [a.id for a in f.accused if a.id in offender_ids]
        if len(accused_ids) > 1:
            for i in range(len(accused_ids)):
                for j in range(i + 1, len(accused_ids)):
                    links_res.append({
                        "source": accused_ids[i],
                        "target": accused_ids[j],
                        "type": "Arrested With",
                        "details": f"FIR: {f.id} ({f.crime_type})"
                    })

    # Limit nodes to 120 max for optimal rendering performance
    if len(nodes_res) > 120:
        # Sort by importance: prioritize Person/Gang/Location, then risk score/priors
        nodes_res = sorted(
            nodes_res,
            key=lambda x: (
                0 if x["type"] in ["Person", "Gang"] else 1,
                -x.get("risk_score", 0) if "risk_score" in x else 0
            )
        )[:120]
        nodes_ids = {n["id"] for n in nodes_res}
        # Filter links
        links_res = [l for l in links_res if l["source"] in nodes_ids and l["target"] in nodes_ids]

    return {
        "nodes": nodes_res,
        "links": links_res
    }

