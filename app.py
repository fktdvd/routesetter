import os
import json
import base64
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import requests

app = FastAPI(title="RouteSetter AI - Vision Prototype")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load .env if present
env_file = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip("'\"")

PIC_DIR = os.path.join(BASE_DIR, "pic")
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

if not os.path.exists(HISTORY_FILE):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2, ensure_ascii=False)

# Static file mounts
app.mount("/pic", StaticFiles(directory=PIC_DIR), name="pic")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

DEMO_BOULDERS = [
    {
        "name": "Sárga Létra (Bemelegítő)",
        "grade": "5C",
        "style": "Kancsók / Könnyű",
        "description": "Kényelmes, jó fogásokkal teli bemelegítő boulder a fal közepén. Ideális az ujjak és a test felkészítésére.",
        "holds": [
            { "role": "start", "x": 44.8, "y": 76.5, "hand": "left", "note": "Alsó sárga perem (bal kéz)" },
            { "role": "start", "x": 52.3, "y": 75.0, "hand": "right", "note": "Jobbos sárga fogás" },
            { "role": "intermediate", "sequence": 1, "x": 46.5, "y": 64.0, "note": "Bal kéz fel a lapos zsebre" },
            { "role": "intermediate", "sequence": 2, "x": 57.0, "y": 55.5, "note": "Jobb kéz a stabil sárga holdra" },
            { "role": "intermediate", "sequence": 3, "x": 42.0, "y": 44.0, "note": "Bal kéz a középső nagy fogásra" },
            { "role": "intermediate", "sequence": 4, "x": 50.5, "y": 32.0, "note": "Felnyúlás a felső peremre" },
            { "role": "top", "x": 48.0, "y": 15.0, "hand": "both", "note": "Felső piros/sárga hold két kézzel" }
        ]
    },
    {
        "name": "Fekete Golyó Kereszt",
        "grade": "6B",
        "style": "Technikai / Keresztezés",
        "description": "Feszültséget igénylő dinamikus út a bal oldali szürke peremektől a felső fekete félgömb felé.",
        "holds": [
            { "role": "start", "x": 38.0, "y": 81.0, "hand": "both", "note": "Alsó stabil startfogás" },
            { "role": "intermediate", "sequence": 1, "x": 32.5, "y": 68.0, "note": "Balra kihajlás a szürke peremre" },
            { "role": "intermediate", "sequence": 2, "x": 43.0, "y": 58.0, "note": "Jobb kéz vissza a fal közepére" },
            { "role": "intermediate", "sequence": 3, "x": 35.0, "y": 42.0, "note": "Hosszú nyúlás a felső szürke fogásra" },
            { "role": "intermediate", "sequence": 4, "x": 41.0, "y": 26.0, "note": "Kéztámasz a nagy fekete félgömbre" },
            { "role": "top", "x": 52.0, "y": 14.0, "hand": "both", "note": "Top stabilizálás két kézzel" }
        ]
    }
]

def load_history() -> List[Dict[str, Any]]:
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_history(data: List[Dict[str, Any]]):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

class FeedbackRequest(BaseModel):
    boulder_id: Optional[str] = None
    name: str
    grade: str
    result: str  # "sent" or "failed"
    perceived_difficulty: str  # "too_easy", "just_right", "too_hard"
    notes: Optional[str] = ""

class GenerateRequest(BaseModel):
    target_grade: str = "6A"
    target_style: str = "All-round"
    api_key: Optional[str] = None

@app.get("/")
def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "RouteSetter AI API fut. Helyezd el a static/index.html fájlt!"}

@app.get("/api/status")
def get_status():
    has_env_key = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "has_api_key": has_env_key,
        "mode": "ai_live" if has_env_key else "demo"
    }

@app.get("/api/history")
def get_history():
    history = load_history()
    return {
        "total_climbs": len(history),
        "history": history
    }

@app.post("/api/feedback")
def submit_feedback(fb: FeedbackRequest):
    history = load_history()
    entry = {
        "id": fb.boulder_id or f"boulder_{int(datetime.now().timestamp())}",
        "name": fb.name,
        "grade": fb.grade,
        "result": fb.result,
        "perceived_difficulty": fb.perceived_difficulty,
        "notes": fb.notes,
        "timestamp": datetime.now().isoformat()
    }
    history.insert(0, entry)
    save_history(history)
    return {"success": True, "entry": entry, "total_climbs": len(history)}

@app.post("/api/generate")
def generate_boulder(req: GenerateRequest):
    api_key = req.api_key or os.environ.get("GEMINI_API_KEY")
    history = load_history()[:8]

    # Climber history context for agent adaptation
    history_lines = [
        f"- '{h['name']}' ({h['grade']}): {h['result'].upper()}, megítélés: {h['perceived_difficulty']}"
        for h in history
    ]
    history_context = "\n".join(history_lines) if history_lines else "Nincs korábbi mászás rögzítve (ez az első út)."

    # If no API key provided, return demo route with customized grade
    if not api_key:
        import random
        demo = random.choice(DEMO_BOULDERS).copy()
        demo["grade"] = req.target_grade
        demo["id"] = f"demo_{int(datetime.now().timestamp())}"
        return {
            "success": True,
            "mode": "demo",
            "message": "Demó módban fut (nem adtál meg Gemini API kulcsot). API kulccsal az AI élőben a fal fotóját elemzi!",
            "boulder": demo
        }

    # Call Gemini Vision API
    ai_img_path = os.path.join(PIC_DIR, "wall_ai.jpg")
    if not os.path.exists(ai_img_path):
        ai_img_path = os.path.join(PIC_DIR, "wall.jpg")

    with open(ai_img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    prompt = f"""You are a master climbing routesetter examining a photo of a spray wall.
Create an ergonomic, realistic, and creative bouldering problem.

CLIMBER CONTEXT & RECENT PERFORMANCE:
{history_context}

REQUESTED BOULDER PARAMETERS:
- Target Grade: {req.target_grade} (e.g. 5C, 6A, 6B+, 7A)
- Movement Style: {req.target_style}
- Feet rule: OPEN FEET (the climber can place their feet on any hold on the wall). Select HAND holds only!

RULES:
1. ONLY select actual holds clearly visible on the wall.
2. Coordinates must be exact percentage locations on the image:
   - x: 0% = left edge, 100% = right edge
   - y: 0% = top ceiling beam, 100% = bottom floor/crashpad
   Note: The climbable wall area is between y=12% and y=85%. Do NOT select holds below y=88% (floor/pad).
3. Hold structure:
   - "start": 1 or 2 hand holds in the lower-middle zone (y between 65% and 82%).
   - "intermediate": 2 to 5 hand holds moving logically upwards. Spacing between successive holds must be reachable (approx 10% to 25% span).
   - "top": 1 finish hold near the top (y between 12% and 24%).
4. Provide a creative climbing name and beta description in Hungarian or English.

Respond ONLY with valid JSON following this exact structure:
{{
  "name": "Boulder Name",
  "grade": "{req.target_grade}",
  "style": "{req.target_style}",
  "description": "Beta instructions and move sequence",
  "holds": [
    {{ "role": "start", "x": 45.2, "y": 78.1, "hand": "left", "note": "Low start jug" }},
    {{ "role": "start", "x": 52.0, "y": 76.5, "hand": "right", "note": "Sidepull crimp" }},
    {{ "role": "intermediate", "sequence": 1, "x": 48.0, "y": 62.3, "note": "Big bump to pinch" }},
    {{ "role": "intermediate", "sequence": 2, "x": 39.5, "y": 45.0, "note": "Cross left to pocket" }},
    {{ "role": "top", "x": 55.0, "y": 16.5, "hand": "both", "note": "Match on top sloper" }}
  ]
}}"""

    models_to_try = [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview"
    ]

    last_error = None
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": img_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "thinkingConfig": {"thinkingBudget": 0},
                "temperature": 0.7
            }
        }

        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(raw_text)

                # Normalize response format
                if isinstance(parsed, list):
                    parsed = {
                        "name": f"{req.target_grade} AI Projekt",
                        "grade": req.target_grade,
                        "style": req.target_style,
                        "description": "AI által generált útvonal.",
                        "holds": parsed
                    }
                
                holds = parsed.get("holds", [])
                for idx, h in enumerate(holds):
                    if "x_percentage" in h and "x" not in h:
                        h["x"] = h["x_percentage"]
                    if "y_percentage" in h and "y" not in h:
                        h["y"] = h["y_percentage"]
                    role = str(h.get("role", "intermediate")).lower()
                    if "start" in role:
                        h["role"] = "start"
                    elif "top" in role or "finish" in role:
                        h["role"] = "top"
                    else:
                        h["role"] = "intermediate"
                        if "sequence" not in h:
                            h["sequence"] = idx

                parsed["holds"] = holds
                parsed["id"] = f"ai_{int(datetime.now().timestamp())}"
                return {
                    "success": True,
                    "mode": "ai_live",
                    "model_used": model_name,
                    "boulder": parsed
                }
            else:
                last_error = f"{model_name} error ({resp.status_code}): {resp.text}"
        except Exception as e:
            last_error = str(e)

    raise HTTPException(status_code=500, detail=f"Nem sikerült generálni a Gemini API-val: {last_error}")
