import zcatalyst_sdk

# Base class mapping for Pydantic Models
class Base:
    pass


class _CatalystDB:
    """Thin wrapper exposing both the ZCQL query API and the Datastore table
    API off a single object. The real SDK splits these across two components
    — app.zcql().execute_query(...) for reads, app.datastore().table(...) for
    writes — but every route in this codebase (and app/ml/features.py) was
    written against a single `db` object offering both, so this wrapper is
    what actually makes that code run instead of hitting AttributeError on
    whichever half wasn't on the object it got."""

    def __init__(self, app):
        self._zcql = app.zcql()
        self._datastore = app.datastore()

    def execute_query(self, query: str):
        return self._zcql.execute_query(query)

    def table(self, table_id):
        return self._datastore.table(table_id)


def get_db():
    try:
        app = zcatalyst_sdk.initialize()
        yield _CatalystDB(app)
    except Exception as e:
        print(f"Error initializing Zoho Catalyst SDK: {e}")
        # Yield a dummy object for local testing if ZCatalyst is not running
        yield None
