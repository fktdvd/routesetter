import json
import os
import random
import tempfile
from datetime import datetime
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")
PIC_DIR = os.path.join(BASE_DIR, "pic")
HOLDS_FILE = os.path.join(DATA_DIR, "holds.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

if not os.path.exists(HOLDS_FILE):
    with open(HOLDS_FILE, "w", encoding="utf-8") as file:
        json.dump([], file, indent=2, ensure_ascii=False)

app = FastAPI(title="RouteSetter - Hold Map")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/pic", StaticFiles(directory=PIC_DIR), name="pic")


class Hold(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    type: Literal["jug", "crimp", "sloper", "pinch"] = "jug"


class GenerateRequest(BaseModel):
    target_grade: str = "6A"
    target_style: str = "All-round"


def load_holds() -> list[dict]:
    try:
        with open(HOLDS_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=500, detail="A fogásleltár nem olvasható.") from error

    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="A fogásleltár formátuma hibás.")
    return data


def save_holds(holds: list[Hold]) -> None:
    payload = [hold.model_dump() for hold in holds]
    directory = os.path.dirname(HOLDS_FILE)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=directory,
            prefix=".holds-",
            suffix=".json",
            delete=False,
        ) as file:
            json.dump(payload, file, indent=2, ensure_ascii=False)
            file.write("\n")
            temporary_path = file.name
        os.replace(temporary_path, HOLDS_FILE)
    except OSError as error:
        if temporary_path and os.path.exists(temporary_path):
            os.unlink(temporary_path)
        raise HTTPException(status_code=500, detail="A fogásleltár mentése sikertelen.") from error


@app.get("/")
def serve_index() -> FileResponse:
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/inventory")
def serve_inventory() -> FileResponse:
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/generator")
def serve_generator() -> FileResponse:
    return FileResponse(os.path.join(STATIC_DIR, "generator.html"))


@app.get("/api/holds")
def get_holds() -> dict:
    holds = load_holds()
    return {"holds": holds, "total": len(holds)}


@app.put("/api/holds")
def replace_holds(holds: list[Hold]) -> dict:
    ids = [hold.id for hold in holds]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="A fogásazonosítók nem lehetnek duplikáltak.")
    save_holds(holds)
    return {"success": True, "holds": [hold.model_dump() for hold in holds], "total": len(holds)}


@app.delete("/api/holds")
def clear_holds() -> dict:
    save_holds([])
    return {"success": True, "holds": [], "total": 0}


@app.post("/api/generate")
def generate_boulder(request: GenerateRequest) -> dict[str, Any]:
    inventory = [Hold.model_validate(hold) for hold in load_holds()]
    if len(inventory) < 4:
        raise HTTPException(
            status_code=400,
            detail="Legalább 4 elmentett fogás szükséges egy boulder generálásához.",
        )

    style_preferences = {
        "Jugs / Big Moves": {"jug": 4, "pinch": 3, "sloper": 1, "crimp": 1},
        "Crimps / Technical": {"crimp": 4, "pinch": 2, "jug": 1, "sloper": 1},
        "Slopers / Body Tension": {"sloper": 4, "pinch": 3, "jug": 1, "crimp": 1},
        "All-round": {"jug": 2, "crimp": 2, "sloper": 2, "pinch": 2},
    }
    type_weights = style_preferences.get(request.target_style, style_preferences["All-round"])
    grade_intermediates = {
        "5C": 2,
        "6A": 3,
        "6A+": 3,
        "6B": 4,
        "6B+": 4,
        "6C": 5,
        "7A": 5,
    }
    intermediate_limit = grade_intermediates.get(request.target_grade, 3)

    # The route is built from inventory IDs and coordinates, never guessed from the photo.
    starts = sorted((hold for hold in inventory if hold.y >= 65), key=lambda hold: hold.y, reverse=True)
    tops = sorted((hold for hold in inventory if hold.y <= 25), key=lambda hold: hold.y)
    if not starts:
        starts = sorted(inventory, key=lambda hold: hold.y, reverse=True)
    if not tops:
        tops = sorted(inventory, key=lambda hold: hold.y)

    start = starts[0]
    top = next((hold for hold in tops if hold.id != start.id), tops[0])
    selected = [start]
    current = start
    remaining = {hold.id: hold for hold in inventory if hold.id not in {start.id, top.id}}

    while remaining and len(selected) < intermediate_limit + 1:
        reachable = [
            hold for hold in remaining.values()
            if hold.y < current.y
            and ((hold.x - current.x) ** 2 + (hold.y - current.y) ** 2) ** 0.5 <= 35
        ]
        if not reachable:
            break
        reachable.sort(key=lambda hold: abs(hold.y - current.y - 14))
        candidates = reachable[: min(5, len(reachable))]
        weights = [
            max(1, type_weights.get(hold.type, 1)) * (1.0 / (1.0 + abs(hold.y - current.y - 14)))
            for hold in candidates
        ]
        current = random.choices(candidates, weights=weights, k=1)[0]
        selected.append(current)
        remaining.pop(current.id)

    selected.append(top)
    route_holds = []
    for index, hold in enumerate(selected):
        if index == 0:
            role = "start"
        elif index == len(selected) - 1:
            role = "top"
        else:
            role = "intermediate"
        route_holds.append({
            "id": hold.id,
            "role": role,
            "sequence": index if role == "intermediate" else None,
            "x": hold.x,
            "y": hold.y,
            "type": hold.type,
        })

    return {
        "success": True,
        "mode": "inventory",
        "boulder": {
            "id": f"inventory_{int(datetime.now().timestamp())}",
            "name": f"{request.target_grade} · {request.target_style}",
            "grade": request.target_grade,
            "style": request.target_style,
            "description": "A fal leltárából választott, fentről lefelé elérhető fogássor.",
            "holds": route_holds,
        },
    }
