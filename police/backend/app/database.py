import zcatalyst_sdk

# Base class mapping for Pydantic Models
class Base:
    pass

def get_db():
    try:
        app = zcatalyst_sdk.initialize()
        datastore = app.datastore()
        yield datastore
    except Exception as e:
        print(f"Error initializing Zoho Catalyst SDK: {e}")
        # Yield a dummy object for local testing if ZCatalyst is not running
        yield None

