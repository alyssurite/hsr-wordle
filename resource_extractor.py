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
    "Female": {
        1001,
        1003,
        1005,
        1006,
        1009,
        1013,
        1014,
        1101,
        1102,
        1103,
        1105,
        1106,
        1107,
        1109,
        1110,
        1112,
        1201,
        1202,
        1206,
        1207,
        1208,
        1210,
        1211,
        1212,
        1214,
        1215,
        1217,
        1220,
        1221,
        1222,
        1224,
        1225,
        1303,
        1306,
        1307,
        1308,
        1309,
        1310,
        1314,
        1317,
        1321,
        1401,
        1402,
        1403,
        1406,
        1407,
        1409,
        1410,
        1412,
        1413,
        1415,
        1501,
        1502,
        8002,
        8004,
        8006,
        8008,
    },
    "Male": {
        1002,
        1004,
        1008,
        1015,
        1104,
        1108,
        1111,
        1203,
        1204,
        1205,
        1209,
        1213,
        1218,
        1223,
        1301,
        1302,
        1304,
        1305,
        1312,
        1313,
        1315,
        1404,
        1405,
        1408,
        1414,
        1504,
        8001,
        8003,
        8005,
        8007,
    },
    "Uncertain": {},
}
PATH_MAPPING = {
    "Knight": "Preservation",
    "Rogue": "The Hunt",
    "Mage": "Erudition",
    "Warlock": "Nihility",
    "Warrior": "Destruction",
    "Shaman": "Harmony",
    "Priest": "Abundance",
    "Memory": "Remembrance",
    "Elation": "Elation",
}


def download_image(url_suffix, save_path: Path):
    """Downloads an image from the repo if it doesn't exist locally."""
    if save_path.exists():
        return  # Skip if already downloaded

    url = f"{BASE_REPO_URL}/{url_suffix}"
    try:
        r = httpx.get(url)
        if r.is_success:
            save_path.write_bytes(r.content)
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
    chars_data = orjson.loads(
        httpx.get(f"{BASE_REPO_URL}/index_new/{LANG}/characters.json").content
    )
    paths_data = orjson.loads(
        httpx.get(f"{BASE_REPO_URL}/index_new/{LANG}/paths.json").content
    )
    elems_data = orjson.loads(
        httpx.get(f"{BASE_REPO_URL}/index_new/{LANG}/elements.json").content
    )

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
        real_path_id = PATH_MAPPING.get(path_id, path_id)
        path_info = paths_data.get(path_id, {})
        path_name: str = path_info.get("text", "Unknown")
        if real_path_id != path_name:
            print("WTF?!")
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

        if char_gender == "Unknown":
            print("Who's that?")

        # images
        char_img_path = DIRS["characters"] / f"{char_id}.png"
        if char_icon_remote:
            download_image(char_icon_remote, char_img_path)
        path_img_path = DIRS["paths"] / f"{path_name}.png"
        if path_icon_remote:
            download_image(path_icon_remote, path_img_path)
        elem_img_path = DIRS["elements"] / f"{elem_id}.png"
        if elem_icon_remote:
            download_image(elem_icon_remote, elem_img_path)

        # db entry
        entry = {
            "id": char_id,
            "name": char_name,
            "gender": char_gender,
            "rarity": char_info.get("rarity", 4),
            "path": path_name,
            "element": elem_name,
            "factions": [],
            "factions_verbose": [],
            "image": str(char_img_path),
            "path_img": str(path_img_path),
            "element_img": str(elem_img_path),
            "species": [],
            "release": "",
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
