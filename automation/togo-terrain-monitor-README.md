# Togo Terrain-Monitor – n8n Setup-Anleitung

Täglicher, vollautomatischer Scan der togolesischen Grundstücksportale mit E-Mail-Report über **neue** Funde. Dedupe eingebaut: bereits gemeldete Anzeigen kommen nicht doppelt.

## Architektur

```
Schedule (07:00) → Zonen-Konfig → Loop pro Zone → Claude API (Websuche)
                                        ↓
                              Parsen + Dedupe (Static Data)
                                        ↓ (Loop-Ende)
                              Alle Zonen bündeln → Neues? → E-Mail-Report
```

Der Scan nutzt die Anthropic-API mit Websuche-Tool – gleiche Technik wie dein Live-Scanner-Artifact, nur unbeaufsichtigt und mit Gedächtnis.

## Installation (5 Minuten)

**1. Workflow importieren**
n8n → Workflows → „Import from File" → `togo-terrain-monitor-n8n.json`

**2. Anthropic-Credential anlegen**
- Credentials → New → **Header Auth**
- Name: `Anthropic API Key (x-api-key)` (exakt so, dann greift die Verknüpfung automatisch)
- Header Name: `x-api-key`
- Header Value: dein API-Key von console.anthropic.com (Format `sk-ant-…`)

Hinweis: Der API-Zugang ist separat von deinem Max-Abo und kostet pro Nutzung. Bei 6 Zonen × 1 Scan/Tag mit Sonnet liegst du grob im Bereich weniger Cent bis ~15 Cent pro Tag, je nach Suchtiefe.

**3. E-Mail-Node konfigurieren**
- Im Node „E-Mail-Report": `toEmail` auf deine Adresse setzen
- SMTP-Credential hinterlegen (z. B. Gmail App-Passwort: smtp.gmail.com, Port 465, SSL)
- Alternative: Node löschen und durch **Telegram**-Node ersetzen (Bot via @BotFather, Chat-ID eintragen, `{{ $json.data }}` analog formatieren) – Push aufs Handy statt Mail

**4. Aktivieren**
Workflow-Schalter oben rechts auf „Active". Erster Testlauf: „Execute Workflow" manuell klicken.

## Anpassen

**Zonen & Budgets** – alles im Node „Zonen-Konfig", ein JS-Array:
```js
{ zone: 'Agoè', maxBudget: 13000000, minSize: 300 },
```
Zeilen hinzufügen/entfernen nach Belieben (Aného, Noépé, Atakpamé …). Mehr Zonen = längere Laufzeit + mehr API-Kosten, linear.

**Zeitplan** – Node „Jeden Morgen 07:00", Cron `0 7 * * *`. Für 2× täglich: `0 7,18 * * *`. Öfter als 2–3×/Tag bringt nichts – die Portale drehen nicht so schnell.

**Dedupe-Gedächtnis zurücksetzen** – falls du alles nochmal gemeldet haben willst: im Node „Parsen + Dedupe" einmalig `staticData.seen = {};` als erste Zeile einfügen, ausführen, wieder entfernen.

## Verzahnung mit deinen Tools

- Die Mail-Funde trägst du bei Interesse in den **Live-Scanner** (Kandidaten-Pipeline mit Score & Due Diligence) oder den Offline-**Terrain-Scanner** ein.
- Optional-Ausbau: statt E-Mail einen **Write File**-Node anhängen, der die Funde als JSON an einen Pfad schreibt, den du per Import-Button in den Offline-Scanner ziehst – dann ist die Pipeline durchgängig.
- Weitere Ausbaustufen, wenn du willst: Google-Sheets-Node als Fundarchiv, oder ein zweiter Branch mit direktem CoinAfrique-HTML-Scraping (HTTP Request + HTML Extract) als Claude-unabhängiger Fallback. Letzteres ist wartungsanfällig (Selektoren ändern sich), daher bewusst nicht im Basis-Workflow.

## Wichtig

KI-Funde sind Hinweise, keine verifizierten Angebote. Workflow-Regel bleibt: Quelle öffnen → Verkäufer kontaktieren → **GFU-Prüfung vor jedem Franc** (Masterplan Phase 3). Nur „3 Tampons" oder besser weiterverfolgen.
