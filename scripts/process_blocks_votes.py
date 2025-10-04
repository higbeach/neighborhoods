#!/usr/bin/env python3
import json
from pathlib import Path
import requests
import geopandas as gpd

DATA_DIR = Path("server/data")
BLOCKS_SHP = DATA_DIR / "Seattle_Blocks_Cleaned.shp"
LOCAL_SUBS = DATA_DIR / "submissions.geojson"
OUTPUT = DATA_DIR / "blocks_with_votes.geojson"

# Set your backend API URL if you want to fetch live submissions
API_SUBMISSIONS_URL = "https://neighborhoods-lgvg.onrender.com/api/submissions"

def load_submissions():
    """
    Try API first; if unavailable, fall back to local file.
    Returns a GeoDataFrame in EPSG:4326 where possible.
    """
    try:
        print(f"Fetching submissions from API: {API_SUBMISSIONS_URL}")
        r = requests.get(API_SUBMISSIONS_URL, timeout=20)
        r.raise_for_status()
        data = r.json()
        subs = gpd.GeoDataFrame.from_features(data["features"], crs="EPSG:4326")
        return subs
    except Exception as e:
        print(f"API fetch failed ({e}). Falling back to local {LOCAL_SUBS}")
        if not LOCAL_SUBS.exists():
            raise FileNotFoundError(f"Missing {LOCAL_SUBS} and API fetch failed.")
        subs = gpd.read_file(LOCAL_SUBS)
        if subs.crs is None:
            subs.set_crs(epsg=4326, inplace=True)
        return subs

def ensure_block_id(gdf):
    """
    Ensure every block has a stable identifier.
    If a suitable field already exists (e.g., 'BLOCK_ID'), use it.
    Otherwise create 'block_id' from index.
    """
    for candidate in ["BLOCK_ID", "block_id", "blk_id", "OBJECTID", "FID"]:
        if candidate in gdf.columns:
            gdf["block_id"] = gdf[candidate].astype(str)
            return "block_id"
    gdf["block_id"] = gdf.index.astype(str)
    return "block_id"

def main():
    # Load blocks shapefile
    if not BLOCKS_SHP.exists():
        raise FileNotFoundError(f"Missing {BLOCKS_SHP}. Include .shp, .shx, .dbf, .prj together.")

    blocks = gpd.read_file(BLOCKS_SHP)

    # Ensure CRS on blocks; default to EPSG:4326 if missing
    if blocks.crs is None:
        blocks.set_crs(epsg=4326, inplace=True)

    # Load submissions
    subs = load_submissions()

    # Align CRS (project submissions to blocks’ CRS)
    subs = subs.to_crs(blocks.crs)

    # Clean invalid geometries
    blocks["geometry"] = blocks["geometry"].buffer(0)
    subs["geometry"] = subs["geometry"].buffer(0)

    # Ensure block_id exists
    id_field = ensure_block_id(blocks)

    # Spatial join: count submissions that intersect each block
    joined = gpd.sjoin(subs, blocks[[id_field, "geometry"]], predicate="intersects", how="inner")

    # Aggregate votes per block
    def safe_name(x):
        try:
            return (x or "").strip()
        except Exception:
            return None

    agg = (
        joined.groupby(id_field)
        .agg(
            vote_count=("index_right", "count"),
            neighborhoods=("neighborhood", lambda s: sorted({safe_name(v) for v in s if safe_name(v)})),
        )
        .reset_index()
    )

    # Merge onto blocks
    result = blocks.merge(agg, on=id_field, how="left")
    result["vote_count"] = result["vote_count"].fillna(0).astype(int)
    result["neighborhoods"] = result["neighborhoods"].apply(lambda x: x if isinstance(x, list) else [])

    # Optional: area in m² using an equal-area CRS
    try:
        ea = result.to_crs(epsg=6933)  # Equal-area projection
        result["area_m2"] = ea.area
    except Exception:
        result["area_m2"] = None

    # Metadata
    result["last_updated"] = gpd.pd.Timestamp.utcnow().isoformat()

    # Write GeoJSON
    result.to_file(OUTPUT, driver="GeoJSON")
    print(f"Wrote {OUTPUT} with {len(result)} blocks and vote counts.")

if __name__ == "__main__":
    main()