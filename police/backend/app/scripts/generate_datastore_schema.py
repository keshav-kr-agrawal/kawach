import os
import json
import inspect
from pydantic import BaseModel
from typing import get_args, get_origin
import app.models as models

def pydantic_to_catalyst_type(field_type) -> dict:
    origin = get_origin(field_type)
    
    # Handle Optional[X] / Union
    if str(origin) == 'typing.Union':
        args = get_args(field_type)
        if type(None) in args:
            field_type = next(a for a in args if a is not type(None))
            origin = get_origin(field_type)
            
    # Handle List (JSON arrays)
    if origin is list or origin is dict:
        return {"data_type": "var-char", "max_length": 5000} # Store JSON strings

    if field_type is int:
        return {"data_type": "bigint"}
    elif field_type is float:
        return {"data_type": "double"}
    elif field_type is bool:
        return {"data_type": "boolean"}
    elif field_type is str:
        return {"data_type": "var-char", "max_length": 255}
    elif getattr(field_type, '__name__', '') == 'datetime':
        return {"data_type": "datetime"}
    elif getattr(field_type, '__name__', '') == 'date':
        return {"data_type": "date"}
        
    return {"data_type": "var-char", "max_length": 255}

def generate_schema():
    tables = []
    for name, obj in inspect.getmembers(models):
        if inspect.isclass(obj) and issubclass(obj, BaseModel) and obj is not BaseModel:
            columns = []
            
            # Assume first field is PK if it ends with ID or is 'id'
            pk_found = False
            for field_name, field_info in obj.__annotations__.items():
                col_def = {"column_name": field_name}
                col_def.update(pydantic_to_catalyst_type(field_info))
                
                # Make first field or '*ID' the unique/mandatory field
                if not pk_found and (field_name.endswith('ID') or field_name == 'id'):
                    col_def["is_unique"] = True
                    col_def["is_mandatory"] = True
                    pk_found = True
                    
                columns.append(col_def)
                
            tables.append({
                "table_name": name,
                "columns": columns
            })
            
    # Write to root datastore folder
    os.makedirs("../../datastore", exist_ok=True)
    with open("../../datastore/datastore-schema.json", "w") as f:
        json.dump(tables, f, indent=4)
        
    print("Successfully generated datastore-schema.json for Catalyst CLI!")

if __name__ == "__main__":
    generate_schema()
