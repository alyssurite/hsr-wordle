import os
import shutil

from pathlib import Path
from bs4 import BeautifulSoup

import orjson
import httpx

BASE_REPO_URL = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master"
LANG = "en"
OUTPUT_JSON = Path("data.json")
ASSETS_DIR = Path("assets")
DIRS = {
    "characters": ASSETS_DIR / "characters",
    "paths": ASSETS_DIR / "paths",
    "elements": ASSETS_DIR / "elements",
}
GENDERS = {
    'Female': {1001, 1003, 1005, 1006, 1009, 1013, 1014, 1101, 1102, 1103, 1105, 1106, 1107, 1109, 1110, 1112, 1201, 1202, 1206, 1207, 1208, 1210, 1211, 1212, 1214, 1215, 1217, 1220, 1221, 1222, 1224, 1225, 1303, 1306, 1307, 1308, 1309, 1310, 1314, 1317, 1321, 1401, 1402, 1403, 1406, 1407, 1409, 1410, 1412, 1413, 1415, 8002, 8004, 8006, 8008},
    'Male': {1002, 1004, 1008, 1015, 1104, 1108, 1111, 1203, 1204, 1205, 1209, 1213, 1218, 1223, 1301, 1302, 1304, 1305, 1312, 1313, 1315, 1404, 1405, 1408, 1414, 8001, 8003, 8005, 8007},
    'Uncertain': {},
}


def get_wiki_data(char_name):
    # Format name for URL (e.g., "Dan Heng • Imbibitor Lunae")
    url_name = char_name.replace(" ", "_").replace('&', '%26')
    url = f"https://honkai-star-rail.fandom.com/wiki/{url_name}"
    
    try:
        response = httpx.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Locate the Infobox
        infobox = soup.find('aside', class_='portable-infobox')
        if not infobox:
            return {}

        data = {
            "species": "Unknown",
            "release": "Unknown",
            "affiliation": [] # List for multiple factions
        }

        # Find all data sections in the infobox
        for group in infobox.find_all('div', class_='pi-item'):
            label_tag = group.find('h3', class_='pi-data-label')
            value_tag = group.find('div', class_='pi-data-value')
            
            if not label_tag or not value_tag:
                continue
                
            label = label_tag.text.strip().lower()

            if "species" in label:
                data["species"] = value_tag.text.strip()
            elif "release date" in label:
                data["release"] = value_tag.span.text.strip()
            elif "factions" in label:
                # Extract multiple factions as a list
                factions = [faction.text.strip() for faction in value_tag.find_all('li')]
                # Filter out empty or duplicate entries
                data["affiliation"] = list(dict.fromkeys(filter(None, factions)))

        return data
    except Exception as e:
        print(f"Error scraping {char_name}: {e}")
        return {}


def download_image(url_suffix, save_path: Path):
    """Downloads an image from the repo if it doesn't exist locally."""
    if save_path.exists():
        return  # Skip if already downloaded

    url = f"{BASE_REPO_URL}/{url_suffix}"
    try:
        r = httpx.get(url, stream=True)
        if r.is_success:
            with open(save_path, 'wb') as f:
                r.raw.decode_content = True
                shutil.copyfileobj(r.raw, f)
            print(f"Downloaded: {save_path}")
        else:
            print(f"Failed to download: {url}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")

def main():
    # ensure dirs exist
    for directory in DIRS.values():
        directory.mkdir(exist_ok=True)

    print("Fetching metadata...")
    
    # fetch data
    chars_data = orjson.loads(httpx.get(f"{BASE_REPO_URL}/index_new/{LANG}/characters.json").content)
    paths_data = orjson.loads(httpx.get(f"{BASE_REPO_URL}/index_new/{LANG}/paths.json").content)
    elems_data = orjson.loads(httpx.get(f"{BASE_REPO_URL}/index_new/{LANG}/elements.json").content)

    final_db = []

    print(f"Found {len(chars_data)} characters. Processing...")

    for char_id_str, char_info in chars_data.items():
        # IDs 8001+ are Trailblazer
        
        # character
        char_id = int(char_id_str)
        char_name: str = char_info.get("name")
        char_icon_remote: str = char_info.get("icon", "")
        
        # path
        path_id = char_info.get("path")
        path_info = paths_data.get(path_id, {})
        path_name: str = path_info.get("text", "Unknown")
        path_icon_remote: str = path_info.get("icon", "")
        
        # element
        elem_id = char_info.get("element")
        elem_info = elems_data.get(elem_id, {})
        elem_name: str = elem_info.get("name", "Unknown")
        elem_icon_remote: str = elem_info.get("icon", "")

        # gender
        char_gender = "Unknown"
        for gender, char_set in GENDERS.items():
            if char_id in char_set:
                char_gender = gender
                if char_name == "{NICKNAME}":
                    if gender == "Female":
                        char_name = f"Stelle (Trailblazer / {path_name})"
                    else:
                        char_name = f"Caelus (Trailblazer / {path_name})"

        # images
        char_img_path = DIRS["characters"] / f"{char_id}.png"
        if char_icon_remote:
            download_image(char_icon_remote, char_img_path)
        path_img_path = DIRS["paths"] / f"{path_id}.png"
        if path_icon_remote:
            download_image(path_icon_remote, path_img_path)
        elem_img_path = DIRS["elements"] / f"{elem_id}.png"
        if elem_icon_remote:
            download_image(elem_icon_remote, elem_img_path)

        # wiki data
        wiki_data = get_wiki_data(char_name=char_name)

        # db entry
        entry = {
            "id": char_id,
            "name": char_name,
            "gender": char_gender,
            "rarity": char_info.get("rarity", 4),
            "path": path_name,
            "element": elem_name,
            "affiliation": "Unknown",

            "image": str(char_img_path),
            "path_img": str(path_img_path),
            "element_img": str(elem_img_path),
            **wiki_data,
        }
        
        final_db.append(entry)

    OUTPUT_JSON.write_bytes(
        orjson.dumps(
            final_db,
            option=orjson.OPT_APPEND_NEWLINE | orjson.OPT_INDENT_2,
        )
    )
    print(f"\nDone! Generated {OUTPUT_JSON} with {len(final_db)} characters.")

if __name__ == "__main__":
    main()
