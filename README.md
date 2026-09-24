# RouteSetter AI

Egy intelligens, webalapú mászóút-tervező és naplózó alkalmazás spray wall-hoz / bouldering falhoz.

## 🎯 Célkitűzés & Alapkoncepció

A cél egy **AI-vezérelt Route Setter (útépítő)** létrehozása, amely:
1. **Automatikusan generál bouldereket** a saját falon meglévő fogásokból.
2. **Kezeli az útvonal logikáját**: Start fogás(ok) -> Köztes fogások (hand holds) -> Top fogás.
3. **Mászói visszajelzés (Feedback Loop)**:
   - Megmászás sikere: Sikerült (Send) vagy nem (Fail / Attempt).
   - Érzékelt nehézség (túl könnyű, pont jó, túl nehéz / fokozat).
4. **Alkalmazkodó / Tanuló ágens**:
   - A visszajelzések alapján az ágens folyamatosan finomhangolja az ajánlott utakat a mászó aktuális erejéhez, morfológiájához és gyengeségeihez/erősségeihez.

---

## 🧗 Szabályok (v1 Protocoll)

* **Nyílt lábak ("Open feet")**: A megjelölt fogások kézfogásokként szolgálnak. Bármelyik fogás/lépés használható lépésre a falon, hogy az indulás egyszerű és élvezetes legyen.
* **Út felépítése**:
  * 🟢 **Start**: 1 vagy 2 start fogás.
  * 🔵 **Köztes fogások**: Sorrendi vagy tetszőleges sorrendben használható fogások.
  * 🔴 **Top**: 1 záró fogás (kétkezes tartással).

---

## 🗺️ Lépésről-lépésre (Baby Steps Roadmap)

- [x] **1. lépés: Kattintásos fogásleltár**
  - A fal képén egy kattintás egy fogást rögzít `x`, `y` koordinátával.
  - Gyors típusválasztó: kancsó, perem, sloper, zseb/pinch.
  - Meglévő jelölésre kattintva törölhető, a teljes leltár menthető.
- [ ] **2. lépés: Útvonal-generáló ágens**
  - A generátor csak a `data/holds.json` leltárból választhat kézfogásokat, ezért nem talál ki új koordinátákat.
- [ ] **3. lépés: Visszajelzés, memória és adaptáció**
  - Korábbi próbálkozások mentése és a prompt kiegészítése a mászói történettel.

## 🧭 Fogásleltározó használata

### Telepítés Apple Silicon Macen

Ha `pydantic_core ... incompatible architecture` hiba jelenik meg, a `.venv`
korábban Intel/x86 Python alatt készült. Hozd létre újra natív ARM64 Pythonnal:

```bash
deactivate 2>/dev/null || true
rm -rf .venv
arch -arm64 python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Ellenőrzés:

```bash
python -c "import platform; print(platform.machine())"
```

Ennek `arm64` értéket kell kiírnia.

```bash
.venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8008
```

Nyisd meg a `http://localhost:8008` címet. Válassz fogástípust (vagy nyomd meg az
`1`–`4` billentyűk egyikét), majd kattints a falon a fogás közepére. Egy meglévő
jelölésre kattintva törölheted, a **Mentés** gomb pedig a `data/holds.json` fájlba
írja a leltárt. A jelölések húzással áthelyezhetők, kattintással törölhetők.
