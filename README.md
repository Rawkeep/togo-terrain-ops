# 🇹🇬 Togo Terrain Ops – Operation Titre Foncier

Komplettes Beschaffungssystem für den Grundstückskauf in Togo: interaktive Checklisten (DE/FR/EN), Such- & Bewertungstools und ein n8n-Workflow für vollautomatisches Markt-Monitoring.

**Design-Prinzipien:** offline-first, Single-File-HTML, keine Server-Abhängigkeit, DSGVO-freundlich (alle Daten lokal im Browser), portabel per USB/WhatsApp.

## Struktur

```
checklists/
  de/  Masterplan Grundstückskauf + SARL-Gründung (Deutsch)
  fr/  Plan directeur + Création SARL (Französisch – zum Teilen mit Notar/Geometer/CFE)
  en/  Master plan + SARL setup (Englisch)
tools/
  togo-terrain-scanner.html       Offline: Plattform-Schnellsuche, Kandidaten-Tracker,
                                  Score 0–100, Due-Diligence-Pipeline, Zonen-Benchmarks
  togo-terrain-live-scanner.jsx   Claude-Artifact: KI-Live-Scan der Portale per
                                  Anthropic-API + Websuche, persistente Kandidatenliste
automation/
  togo-terrain-monitor-n8n.json   n8n-Workflow: täglicher Auto-Scan aller Zonen,
                                  Dedupe, E-Mail-Report nur bei neuen Funden
  togo-terrain-monitor-README.md  Setup-Anleitung (Credentials, SMTP, Anpassung)
```

## Pipeline

```
n8n-Monitor (findet automatisch, täglich 07:00)
        ↓
Live-Scanner / Offline-Scanner (bewerten: Papiere 40 · Preis 35 · Lage 15 · DD 10)
        ↓
Masterplan-Checkliste (führt durch den Kauf bis zum Titre Foncier)
        ↓
SARL-Checkliste (optional: Variante B, Kauf über eigene Gesellschaft)
```

## Nutzung

- **Checklisten & Offline-Scanner:** HTML-Datei im Browser öffnen. Fortschritt/Kandidaten
  werden in `localStorage` gespeichert. DE/FR/EN teilen sich die Speicher-Schlüssel –
  Häkchen sind sprachübergreifend synchron (gleicher Browser).
- **Live-Scanner:** `.jsx` in claude.ai als Artifact laden (oder Code in ein
  React-Projekt übernehmen). Nutzt `window.storage` (Artifact-Persistenz) und die
  Anthropic-API mit `web_search`-Tool.
- **n8n-Monitor:** siehe `automation/togo-terrain-monitor-README.md` – Import,
  API-Key-Credential, SMTP, aktivieren. ~5 Minuten.

## Eiserne Regeln (aus dem Masterplan)

1. **Keine Zahlung** vor GFU-Prüfung (Lastenfreiheit) und Notar-Freigabe.
2. Papier-Hierarchie: **Titre Foncier > 3 Tampons > Plan visé > Plan simple.**
   Unter „3 Tampons" nicht weiterverfolgen.
3. Ausländerkauf: **Autorisation préalable (Art. 317 Code foncier 2018)** zwingend –
   oder Variante B über eigene SARL.
4. Zahlungen ausschließlich über das Notar-Anderkonto.

## Schlüsselkontakte

| Stelle | Kontakt |
|---|---|
| GFU / OTR (DCCFE) | 41 rue des Impôts, Lomé · +228 22 53 14 00 · [e-foncier.otr.tg](https://e-foncier.otr.tg) |
| Notarkammer CNNT | Tokoin Forever · +228 22 26 80 22 · [notaires.tg/annuaire](https://notaires.tg/annuaire/) |
| Geometer-Kammer OGT | Blvd du 30 Août · +228 22 21 80 38 · cogt88@gmail.com |
| CFE (SARL) | CCIT, Av. de la Présidence · +228 22 20 63 60 · [cfetogo.tg](https://cfetogo.tg) |

## Disclaimer

Arbeitshilfen, keine Rechtsberatung. Gebühren/Verfahren nach offiziellen Quellen
(Stand 2026), vor Ort bestätigen lassen. 1 € ≈ 655,957 FCFA (fix).
