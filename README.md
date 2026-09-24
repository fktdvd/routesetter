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

- [x] **1. lépés: Útvonal-generáló ágens alapjai**
  - Multimodális Gemini 3 Vision integráció és JSON kimenet.
- [x] **2. lépés: Webes megjelenítő prototípus (Frontend)**
  - Interaktív pan & zoom felület neon fogásjelölésekkel.
- [x] **3. lépés: Visszajelzés modul (Feedback UI)**
  - Send/Attempt és nehézség visszajelzés (`data/history.json`).
- [x] **4. lépés: Memória és adaptáció (Learning Agent)**
  - Az előzmények visszacsatolása az AI promptba.

---

## 🚀 Szerver indítása kézzel

Ha újraindítod a gépet vagy külön terminálablakból szeretnéd futtatni a szervert:

### 1. Előkészületek (ha új gépen vagy):
```bash
# Virtuális környezet létrehozása és csomagok telepítése
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. API kulcs beállítása:
Hozz létre egy `.env` fájlt a projekt gyökerében:
```bash
GEMINI_API_KEY=a_te_gemini_api_kulcsod
```

### 3. Szerver indítása:
```bash
.venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8008
```
*(vagy aktivált venv mellett: `python -m uvicorn app:app --host 0.0.0.0 --port 8008`)*

### 4. Megnyitás a böngészőben:
* **Számítógépen:** [http://localhost:8008](http://localhost:8008)
* **Telefonon (azonos Wi-Fi hálózaton):** `http://<geped_ip_cime>:8008` (pl. `http://192.168.0.13:8008`)

