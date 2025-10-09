import os
import geopandas as gpd
import pandas as pd
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# -------------------- LOAD ENV --------------------
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Supabase credentials not found in environment variables.")

# -------------------- CONFIG --------------------
BLOCKS_PATH = "server/data/blocks.geojson"
OUTPUT_PATH = "server/data/blocks_with_votes.geojson"

# -------------------- LOAD BLOCKS --------------------
if not os.path.exists(BLOCKS_PATH):
    raise FileNotFoundError(f"❌ Missing block file: {BLOCKS_PATH}")

blocks = gpd.read_file(BLOCKS_PATH)
blocks = blocks.set_index("BLOCK_ID")
print(f"📦 Loaded {len(blocks)} blocks")

# -------------------- LOAD SUBMISSIONS FROM SUPABASE --------------------
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
response = supabase.table("submissions").select("geometry", "properties").execute()
rows = response.data

if not rows:
    raise ValueError("❌ No submissions returned from Supabase.")

# -------------------- CONVERT TO GeoDataFrame --------------------
features = []
for row in rows:
    if row.get("geometry") and row.get("properties"):
        props = row["properties"]
        props["neighborhood_name"] = props.get("neighborhood")  # ✅ use correct field
        features.append({
            "type": "Feature",
            "geometry": row["geometry"],
            "properties": props
        })

submissions = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
submissions = submissions[submissions["neighborhood_name"].notnull()]
print(f"🗺️ Loaded {len(submissions)} valid submissions")

# -------------------- SPATIAL JOIN --------------------
joined = gpd.sjoin(blocks, submissions, how="left", predicate="within")

# -------------------- COUNT NEIGHBORHOOD MENTIONS --------------------
counts = (
    joined.groupby(["BLOCK_ID", "neighborhood_name"])
    .size()
    .reset_index(name="count")
)

# -------------------- PIVOT AND CALCULATE PERCENTAGES --------------------
pivot = counts.pivot(index="BLOCK_ID", columns="neighborhood_name", values="count").fillna(0)
pivot["vote_count"] = pivot.sum(axis=1)  # ✅ renamed for frontend compatibility

for col in pivot.columns:
    if col != "vote_count":
        pivot[col + "_pct"] = (pivot[col] / pivot["vote_count"]) * 100

# -------------------- ADD DOMINANT NEIGHBORHOOD --------------------
pct_cols = [c for c in pivot.columns if c.endswith("_pct")]
pivot["dominant_neighborhood"] = pivot[pct_cols].idxmax(axis=1).str.replace("_pct", "")

# -------------------- MERGE BACK TO BLOCKS --------------------
blocks_with_votes = blocks.join(pivot, how="left")
blocks_with_votes["last_updated"] = datetime.now(timezone.utc).isoformat()

# -------------------- EXPORT --------------------
blocks_with_votes.to_file(OUTPUT_PATH, driver="GeoJSON")
print(f"✅ Exported enriched blocks to {OUTPUT_PATH}")