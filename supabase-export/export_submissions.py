import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

COLUMN_LABELS = {
    "survey_age": "Age Range",
    "survey_gender": "Gender",
    "survey_income": "Household Income",
    "survey_employed": "Currently Employed",
    "survey_married": "Marital Status",
    "survey_identity": "Part of who I am",
    "survey_belonging": "Feel I Belong",
    "survey_awareOfEvents": "Aware of Local Events",
    "survey_householdSize": "Household Size",
    "survey_householdKids": "Number of Kids",
    "survey_ethnicity": "Ethnicity",

    "survey_knowNeighbors": "How Many Neigbors known",
    "survey_friendNeighbors": "Neigbors as Friends",
    "survey_talkRegularly": "Talk Regularly with Neighbors",
    "survey_civicGroups": "Social or Civic Group Participation",
    
    "survey_senseOfCommunity": "Gives me Sense of Community",
    "survey_belonging": "I feel like I belong",
    "survey_conflictWithNeighbors": "Conflict with Neighbors",

    "survey_acceptanceRace": "Acceptance of Race/Ethnicity",
    "survey_acceptancePolitics": "Acceptance of Political Views",

    "survey_trust": "People Can be Trusted",

    "survey_satisfaction": "Satisfied as a Place to Live",
    "survey_helpfulNeighbors": "Neighbors Willing to Help",
    "survey_problemSolving": "Deal with Problems",
    "survey_willingtoImrpove": "Would be willing to Work Together",
    "additionalComments": "Additional Comments",

    "location_lat": "Latitude",
    "location_lng": "Longitude",
    "neighborhood": "Neighborhood Name",
    "years": "Years in Neighborhood",
    "comments": "User Comments",
    "timestamp": "Submission Time",
    "ip_address": "IP Address"
}

# -------------------- LOAD ENV --------------------
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")  # or SUPABASE_SERVICE_ROLE if you prefer

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Supabase credentials not found in environment variables.")

# -------------------- CONNECT TO SUPABASE --------------------
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------------- FETCH SUBMISSIONS --------------------
response = supabase.table("submissions").select("id, properties").execute()
rows = response.data

if not rows:
    raise ValueError("❌ No submissions returned from Supabase.")

# -------------------- FLATTEN PROPERTIES --------------------
flattened = []
for row in rows:
    base = {
        "id": row["id"]
    }

    props = row.get("properties", {})
    if isinstance(props, dict):
        # Flatten top-level props
        for key, value in props.items():
            if isinstance(value, dict):
                # Flatten known nested objects like survey and location
                if key == "survey":
                    for subkey, subvalue in value.items():
                        base[f"survey_{subkey}"] = subvalue
                elif key == "location":
                    base["location_lat"] = value.get("lat")
                    base["location_lng"] = value.get("lng")
                else:
                    # Generic fallback for other nested objects
                    for subkey, subvalue in value.items():
                        base[f"{key}_{subkey}"] = subvalue
            else:
                base[key] = value

    flattened.append(base)


# -------------------- EXPORT TO EXCEL --------------------
df = pd.DataFrame(flattened)
output_path = os.path.join(os.path.dirname(__file__), "submissions_flat.xlsx")
df.rename(columns=COLUMN_LABELS, inplace=True)
df.to_excel(output_path, index=False)
print(f"✅ Export complete: {output_path}")