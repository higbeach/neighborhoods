#!/usr/bin/env python3
import json
from pathlib import Path
import requests
import geopandas as gpd

DATA_DIR = Path("server/data")
BLOCKS_GEOJSON = DATA_DIR / "blocks.geojson"
LOCAL_SUBS = DATA_DIR / "submissions.geojson"
OUTPUT = DATA_DIR / "blocks_with_votes.geojson"

API_SUBMISSIONS_URL = "https://neighborhoods-server.onrender.com/api/submissions"

def load_submissions():
    try:
        print(f"🌐 Fetching submissions from API: {API_SUBMISSIONS_URL}")
        r = requests.get(API_SUBMISSIONS_URL, timeout=20)
        r.raise_for_status()
        data = r.json()
        subs = gpd.GeoDataFrame.from_features(data["features"], crs="EPSG:4326")
        print(f"✅ Loaded {len(subs)} submissions from API")
        return subs
    except Exception as e:
        print(f"⚠️ API fetch failed ({e}). Falling back to local {LOCAL_SUBS}")
        if not LOCAL_SUBS.exists():
            raise FileNotFoundError(f"Missing {LOCAL_SUBS} and API fetch failed.")
        subs = gpd.read_file(LOCAL_SUBS)
        if subs.crs is None:
            subs.set_crs(epsg=4326, inplace=True)
        print(f"✅ Loaded {len(subs)} submissions from local file")
        return subs

def ensure_block_id(gdf):
    for candidate in ["BLOCK_ID", "block_id", "blk_id", "OBJECTID", "FID"]:
        if candidate in gdf.columns:
            gdf["block_id"] = gdf[candidate].astype(str)
            return "block_id"
    gdf["block_id"] = gdf.index.astype(str)
    return "block_id"

def main():
    if not BLOCKS_GEOJSON.exists():
        raise FileNotFoundError(f"Missing {BLOCKS_GEOJSON}")

    blocks = gpd.read_file(BLOCKS_GEOJSON)
    print(f"✅ Loaded {len(blocks)} blocks")
    print("🧭 Blocks CRS:", blocks.crs)

    if blocks.crs is None:
        print("⚠️ Blocks CRS missing — assigning EPSG:4326")
        blocks.set_crs(epsg=4326, inplace=True)

    subs = load_submissions()
    print("🧭 Submissions CRS (before projection):", subs.crs)

    subs = subs.to_crs(blocks.crs)
    print("🧭 Submissions CRS (after projection):", subs.crs)

    blocks["geometry"] = blocks["geometry"].buffer(0)
    subs["geometry"] = subs["geometry"].buffer(0)

    print("📦 Sample block geometry:", blocks.geometry.iloc[0])
    if len(subs) > 0:
        print("📍 Sample submission geometry:", subs.geometry.iloc[0])

    id_field = ensure_block_id(blocks)

    joined = gpd.sjoin(subs, blocks[[id_field, "geometry"]], predicate="intersects", how="inner")
    print(f"🔗 Spatial join matched {len(joined)} submissions to blocks")

    def safe_name(x):
        try:
            return (x or "").strip()
        except Exception:
            return None

    if "neighborhood" in joined.columns:
        agg = (
            joined.groupby(id_field)
            .agg(
                vote_count=("index_right", "count"),
                neighborhoods=("neighborhood", lambda s: sorted({safe_name(v) for v in s if safe_name(v)})),
            )
            .reset_index()
        )
    else:
        agg = (
            joined.groupby(id_field)
            .agg(vote_count=("index_right", "count"))
            .reset_index()
        )
        agg["neighborhoods"] = [[] for _ in range(len(agg))]

    result = blocks.merge(agg, on=id_field, how="left")
    result["vote_count"] = result["vote_count"].fillna(0).astype(int)
    result["neighborhoods"] = result["neighborhoods"].apply(lambda x: x if isinstance(x, list) else [])

    try:
        ea = result.to_crs(epsg=6933)
        result["area_m2"] = ea.area
    except Exception:
        result["area_m2"] = None

    result["last_updated"] = gpd.pd.Timestamp.utcnow().isoformat()

    result.to_file(OUTPUT, driver="GeoJSON")
    print(f"✅ Wrote {OUTPUT} with {len(result)} blocks and vote counts")

if __name__ == "__main__":
    main()