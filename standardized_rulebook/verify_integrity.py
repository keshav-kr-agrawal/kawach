import os
import json
import xml.etree.ElementTree as ET

# Configuration
rules_laws_dir = "/Users/keshav/zoho/rules and laws"
old_laws_dir = os.path.join(rules_laws_dir, "old_laws_1860_1973")
xml_dir = os.path.join(rules_laws_dir, "laws-of-india", "consolidated")
output_dir = "/Users/keshav/zoho/standardized_rulebook"

# Source File Targets and expected types
targets = {
    # Root JSON
    "BNS.json": {
        "dest": "Bharatiya_Nyaya_Sanhita.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(rules_laws_dir, "BNS.json")
    },
    "BNSS.json": {
        "dest": "Bharatiya_Nagarik_Suraksha_Sanhita.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(rules_laws_dir, "BNSS.json")
    },
    "BSA.json": {
        "dest": "Bharatiya_Sakshya_Adhiniyam.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(rules_laws_dir, "BSA.json")
    },
    "COI.json": {
        "dest": "Constitution_of_India.json",
        "type": "json_list",
        "key": "article",
        "path": os.path.join(rules_laws_dir, "COI.json")
    },
    # Old Laws JSON
    "ipc.json": {
        "dest": "Indian_Penal_Code.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "ipc.json")
    },
    "crpc.json": {
        "dest": "Code_of_Criminal_Procedure.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "crpc.json")
    },
    "iea.json": {
        "dest": "Indian_Evidence_Act.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "iea.json")
    },
    "cpc.json": {
        "dest": "Code_of_Civil_Procedure.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "cpc.json")
    },
    "MVA.json": {
        "dest": "Motor_Vehicles_Act.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "MVA.json")
    },
    "hma.json": {
        "dest": "Hindu_Marriage_Act.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "hma.json")
    },
    "ida.json": {
        "dest": "Indian_Divorce_Act.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "ida.json")
    },
    "nia.json": {
        "dest": "Negotiable_Instruments_Act.json",
        "type": "json_list",
        "key": "section",
        "path": os.path.join(old_laws_dir, "nia.json")
    },
    # XML Acts
    "The Indian Contract Act, 1872.xml": {
        "dest": "Indian_Contract_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "The Indian Contract Act, 1872.xml")
    },
    "The Information Technology Act, 2000.xml": {
        "dest": "Information_Technology_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "The Information Technology Act, 2000.xml")
    },
    "The Prevention of Corruption Act, 1988.xml": {
        "dest": "Prevention_of_Corruption_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "The Prevention of Corruption Act, 1988.xml")
    },
    "The Right to Information Act, 2005.xml": {
        "dest": "Right_to_Information_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "The Right to Information Act, 2005.xml")
    },
    "The Dowry Prohibition Act, 1961.xml": {
        "dest": "Dowry_Prohibition_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "The Dowry Prohibition Act, 1961.xml")
    },
    "The Consumer Protection Act, 1986.xml": {
        "dest": "Consumer_Protection_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "The Consumer Protection Act, 1986.xml")
    },
    "Aadhaar (Targeted Delivery Of Financial And Other Subsidies, Benefits And Services) Act, 2016.xml": {
        "dest": "Aadhaar_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "Aadhaar (Targeted Delivery Of Financial And Other Subsidies, Benefits And Services) Act, 2016.xml")
    },
    "Juvenile Justice (Care and Protection of Children) Act, 2015.xml": {
        "dest": "Juvenile_Justice_Act.json",
        "type": "xml",
        "path": os.path.join(xml_dir, "Juvenile Justice (Care and Protection of Children) Act, 2015.xml")
    }
}

ns = {"ns": "http://www.akomantoso.org/2.0"}

def count_source_sections(src_info):
    path = src_info["path"]
    if src_info["type"] == "json_list":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        key = src_info["key"]
        return sum(1 for entry in data if entry.get(key) is not None)
    elif src_info["type"] == "xml":
        tree = ET.parse(path)
        root = tree.getroot()
        sections = root.findall(".//ns:section", ns)
        return len(sections)
    return 0

def count_dest_sections(dest_filename):
    path = os.path.join(output_dir, dest_filename)
    with open(path, "r", encoding="utf-8") as f:
        doc = json.load(f)
    total = 0
    for ch in doc["chapters"]:
        total += len(ch["sections"])
    return total

print("="*60)
print("             DATA INTEGRITY CHECK REPORT")
print("="*60)

all_ok = True
for name, info in targets.items():
    src_count = count_source_sections(info)
    dest_count = count_dest_sections(info["dest"])
    
    diff = src_count - dest_count
    status = "OK" if diff == 0 else "FAIL"
    if diff != 0:
        all_ok = False
        
    print(f"File: {name:<50}")
    print(f"  Source count: {src_count:>4} | Destination count: {dest_count:>4} | Status: {status}")
    if diff != 0:
        print(f"  WARNING: Difference of {diff} sections detected!")

print("\n"+"="*60)
print("             DIRECTORY FLATNESS CHECK")
print("="*60)

# Check if there are any subdirectories inside standardized_rulebook
subdirs = []
files = []
for entry in os.scandir(output_dir):
    if entry.is_dir():
        subdirs.append(entry.name)
    elif entry.is_file():
        files.append(entry.name)

print(f"Total files in output directory: {len(files)}")
print(f"Subdirectories found: {len(subdirs)}")
if len(subdirs) == 0:
    print("Flatness Status: PASS (Directory is strictly flat)")
else:
    all_ok = False
    print(f"Flatness Status: FAIL (Found subdirectories: {subdirs})")

print("\n"+"="*60)
if all_ok:
    print("  INTEGRITY & FORMAT CHECK RESULT: SUCCESS (NO DATA LOST)")
else:
    print("  INTEGRITY & FORMAT CHECK RESULT: FAILED")
print("="*60)
