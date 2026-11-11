# Bühne – 3D-Szenenplanung

Eigene Web-App zum Blocken von 3D-Szenen für KI-Bild- und Videogenerierung. Schlichte Bühne, posierbare Gliederpuppen, primitive Objekte, Shot-Kamera, Licht und PNG-Export als Kompositionsreferenz.

Die Oberfläche ist auf Deutsch und für Touch auf dem iPhone ausgelegt. Es gibt keinen Build-Schritt: `index.html` plus ES-Module, three.js liegt lokal im Ordner `vendor/three` (Version 0.187.0, MIT).

## Öffnen

Die Datei muss über HTTP geladen werden (nicht als `file://`), damit die Module funktionieren.

- Live: https://traumvii.github.io/buehne/
- Lokal: beliebiger statischer Server im Ordner, zum Beispiel `python3 -m http.server 4173`

Zum Home-Bildschirm: in Safari „Zum Home-Bildschirm“ wählen (PWA-Manifest ist enthalten).

## Bedienung

- Ein Finger dreht die Arbeitsansicht, zwei Finger zoomen und verschieben.
- **Einfügen:** Figur, Primitive, Möbel, Baum, Auto, Felsen, Haus, Punkt- und Spotlicht sowie eine durchsuchbare CC0-Objektbibliothek (Kenney, Quaternius, Poly Haven). Optional ein Raum mit Wänden.
- Objekt antippen zum Auswählen. Unter **Bearbeiten** verschieben, drehen, skalieren (Gizmo oder Slider), Farbe, Duplizieren, Löschen.
- Figuren: Pose-Voreinstellungen (stehen, gehen, sitzen, zeigen, kniend, liegend) und Gelenk-Slider.
- **Kamera:** Brennweite 14–200 mm, Seitenverhältnisse 16:9, 9:16, 2.39:1, 4:3, 1:1. „Durch die Shot-Kamera schauen“ zeigt den Bildrahmen mit Drittellinien. Mehrere Shots speicherbar.
- **Licht:** Morgen, Mittag, Abend, Nacht, Studio; Sonne und Umgebung manuell; Schatten ein/aus.
- **Welt:** Gebaute 3D-Landschaften (Wald, Wiese/Feld, Wüste, Berge, Küste, See, Stadt, Innenraum, Höhle, Ruine), Himmel mit Tag/Nacht, Mondphasen, Wolken, optional Nebel, Regen oder Schnee. Das Licht folgt Sonne und Mond.
- **Größen:** Objekte per Text („ein drei Meter hoher Baum“, „riesig/klein/winzig“) oder per Slider; Personen können auf Felsen, Dach oder Tisch stehen. Kamerahöhe bis 30 m, Drohne und Froschperspektive.
- **Text:** Szene auf Deutsch beschreiben oder mit dem Mikrofon-Knopf diktieren (Web Speech API, Deutsch), zum Beispiel `zwei Personen stehen sich gegenüber, links ein Tisch, Kamera halbnah, Abendlicht`. Satzteile werden an Kommas, „und“ und „eine andere“ getrennt. Unterstützt werden Mengen, Richtungen, Posen, Verneinungen, Brennweiten, Landschaften, Himmel, Wetter, Objektgrößen und Kamerahöhen. Ein lokaler Parser ohne API-Schlüssel setzt die Szene. Danach manuell korrigieren. Beschriebene Figuren und Objekte ersetzen die aktuelle Bühne.
- **Export:** PNG der Shot-Kamera in Farbe, Graustufen oder Tiefe, Teilen oder Download. Szene als JSON speichern und laden. Autosave im Browser (`localStorage`).
- Oben: Rückgängig und Wiederholen.

## Technik

Reine Client-App, keine Server-Logik, kein CDN. Bibliothek: [three.js](https://github.com/mrdoob/three.js) (MIT) mit OrbitControls, TransformControls, Sky-Shader und GLTFLoader. Objektquellen stehen in [ASSETS.md](ASSETS.md). Der Text-Wortschatz steht in [VOCABULARY.md](VOCABULARY.md) und wird aus denselben Parser-Daten erzeugt (`npm run vocab` bzw. `node scripts/generate-vocabulary.mjs`).

## Tests

```bash
npm install
npx playwright install chromium
npx playwright test
```

Die Suite läuft in Chromium. WebKit ist auf manchen Hosts wegen fehlender Systembibliotheken nicht startbar.
