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

- [ ] **1. lépés: Útvonal-generáló ágens alapjai**
  - Hogyan reprezentáljuk a falat és a fogásokat az AI számára?
  - Alap prompt és kimeneti séma (JSON: start, intermediates, top).
- [ ] **2. lépés: Webes megjelenítő prototípus (Frontend)**
  - A fal képének megjelenítése ([`pic/FullSizeRender-preview.HEIC`](file:///Users/feketedavid/Documents/GitHub/routesetter/pic/FullSizeRender-preview.HEIC) konvertálva/optimalizálva webre).
  - Az AI által generált pontok/fogások vizuális kirajzolása (színes karikák: zöld, kék, piros).
  - Mobilos böngészőre optimalizált nézet (érintés, zoom/pan).
- [ ] **3. lépés: Visszajelzés modul (Feedback UI)**
  - Gombok: "Megmásztam" / "Nem sikerült".
  - Nehézségi értékelés bekérése.
- [ ] **4. lépés: Memória és adaptáció (Learning Agent)**
  - Korábbi próbálkozások mentése (helyi tárhely vagy adatbázis).
  - A prompt kiegészítése a korábbi történettel (few-shot / in-context learning).
