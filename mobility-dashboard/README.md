# Mobilitätsdashboard der Universität Regensburg

Interaktives Dashboard zur Exploration und Kommunikation der Mobilitätsumfrage der Universität Regensburg. Die Anwendung zeigt zentrale Ergebnisse zu Pendelmobilität, Verkehrsmitteln, Distanzen, ÖPNV-Hürden, Verbesserungswünschen, qualitativen Freitextaussagen und regionalen Mustern nach PLZ.

Die Anwendung ist als Single-Page-Dashboard mit Svelte 5 und Vite umgesetzt. Standarddiagramme werden mit Vega-Lite gerendert, die PLZ-Karte wird mit D3/SVG dargestellt.

## Technischer Stack

- Svelte 5
- Vite
- Vega, Vega-Lite und vega-embed
- D3-DSV für CSV-Verarbeitung
- D3-basierte PLZ-Karte
- Node.js für die qualitative Datenaufbereitung
- Python + Shapely für die PLZ-Datenaufbereitung

## Projektstruktur

```text
src/
  app/                         Dashboard-Shell und Hauptlayout
  components/                  Wiederverwendbare UI- und Chart-Komponenten
  content/                     Zentrale sichtbare Dashboard-Texte
  data/                        Datenloader, Aggregationen und Domain-Definitionen
  features/                    Dashboard-Bereiche und Feature-Module
  stores/                      Globaler Dashboard-Filterzustand
  utils/                       Hilfsfunktionen

public/data/                   Öffentliche, frontend-seitig geladene CSV/JSON-Daten
public/data/plz-map/           Vorbereitete PLZ-Geometrien und PLZ-Metriken
public/data/qualitative-data/  Vorbereitete qualitative Summary-Daten

data-private/                 Private Rohdaten und Kontrollausgaben
scripts/                       Datenaufbereitungsskripte
```

## Installation

```bash
npm install
```

Alternativ für eine reproduzierbare Installation mit vorhandener `package-lock.json`:

```bash
npm ci
```

## Entwicklung starten

```bash
npm run dev
```

Die Anwendung läuft danach lokal über den von Vite ausgegebenen Link, meist:

```text
http://localhost:5173/
```

## Produktionsbuild erstellen

```bash
npm run build
```

Der fertige Build wird in `dist/` erzeugt.

Zum lokalen Prüfen des Builds:

```bash
npm run preview
```

## Datenaufbereitung

Die Anwendung lädt vorbereitete CSV- und JSON-Dateien aus `public/data/`. Die Rohdaten und Kontrollausgaben liegen in `data-private/` und sollten nicht öffentlich deployed werden.

### Qualitative Freitextdaten neu erzeugen

Dieses Script bereitet die offenen Freitextantworten auf, filtert nicht-informative Aussagen, ordnet Aussagen einfachen Themen zu und erzeugt die frontend-seitige Summary-JSON.

```bash
npm run prepare:qualitative
```

Eingabe:

```text
data-private/qualitative_feedback_plz.csv
```

Wichtige Ausgaben:

```text
public/data/qualitative-data/qualitative_theme_summary.json
data-private/qualitative_feedback_normalized.csv
data-private/qualitative_feedback_dropped.csv
```

Nach Änderungen an den qualitativen Rohdaten oder am Script sollte `npm run prepare:qualitative` erneut ausgeführt werden.

### PLZ-Kartendaten neu erzeugen

Dieses Script bereitet die PLZ-Geometrien und regionalen Metriken für die Karte vor. Dafür wird Shapely benötigt.

```bash
pip install shapely
npm run prepare:plz-map
```

Eingaben:

```text
data-private/plz_shape_coords.csv (Diese Datei befindet sich aufgrund ihrer Größe (>150MB) nicht im Projekt)
data-private/plz_mapping.csv
public/data/data_vehicle.csv
```

Wichtige Ausgaben:

```text
public/data/plz-map/plz_focus_regions.geojson
public/data/plz-map/plz_focus_metrics.json
data-private/plz_map_join_inspection.csv
```

Das Script muss nur erneut ausgeführt werden, wenn sich die PLZ-Rohdaten, das Mapping, die Verkehrsmitteldaten oder die PLZ-Aufbereitung ändern.

## Wichtige Hinweise zur Interpretation

- Die Daten stammen aus einer Mobilitätsumfrage und sind keine Vollerhebung.
- Die sichtbaren Hauptgruppen im Dashboard sind Studierende, Mitarbeitende und Professor:innen.
- Prozentwerte haben je nach Diagramm unterschiedliche Bezugsgrößen; die Hinweise direkt bei den Diagrammen erklären den jeweiligen Nenner.
- Die qualitative Ansicht zeigt vorbereitete, thematisch gruppierte Freitextaussagen. Die Beispiele sind ausgewählte, lesbare Originalaussagen und nicht als vollständige qualitative Analyse zu verstehen.
- Die PLZ-Karte zeigt surveybasierte regionale Muster im vorbereiteten Fokusbereich, keine exakten Pendelrouten.

## Nützliche Befehle

```bash
npm run dev                  # Entwicklungsserver starten
npm run build                # Produktionsbuild erstellen
npm run preview              # Produktionsbuild lokal prüfen
npm run prepare:qualitative  # qualitative Summary-Daten neu erzeugen
npm run prepare:plz-map      # PLZ-Geometrien und PLZ-Metriken neu erzeugen
```
