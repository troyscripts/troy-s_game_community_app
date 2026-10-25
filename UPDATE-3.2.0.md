# Update 3.2.0

## Installeren vanaf 3.1.9

Stop de bot en vervang de bestanden uit het pakket op dezelfde paden. Neem het nieuwe `utils/logNames.js` mee. Bewaar `.env`, database en eigen bestanden in `data/`. Herstart de bot. Geen gewijzigde dependencies, slashcommands of configvelden; commandodeploy is niet nodig. Installeer bij een schone installatie met `npm ci --no-audit --no-fund`.

Het volledige pakket bevat alle eerdere correcties en actuele handleidingen. Het pakket met alleen gewijzigde bestanden is bedoeld voor de eerder geleverde 3.1.9-versie inclusief documentatiecorrectie.

## Gedrag

- Nieuwe logs tonen beschikbare namen voor gebruikers, kanalen, rollen, audituitvoerders en doelen; ID's blijven aanvullende informatie.
- Voicevelden krijgen leesbare labels en Ja/Nee. Interactielogs krijgen aparte gebruiker-/kanaalvelden. Berichtlogs bevatten een link en beschikbare embedtekst.
- Namen komen uit het gebeurtenisobject en bestaande servercache. Ontbreekt de naam, dan volgt expliciet ‘onbekend/verwijderd’ met ID. Geen extra API-verzoeken of pings. Oude logs en wachtrijregels worden niet herschreven.
- Radio meldt pas succes na gedecodeerde audio van FFmpeg en afspeelstatus. Geen audio binnen 20 seconden wachten op audio, een vroegtijdig gesloten stream of annulering geeft geen succesmelding. Een stream kan later nog uitvallen.
- Veronica en overige stream-URL's blijven ongewijzigd. Dit repareert geen externe netwerk- of TLS-storing.

## Documentatie

HANDLEIDING.md, MANUAL-EN.md, README.md, RADIO-HANDLEIDING.md, LOGGING-HANDLEIDING.md, INSTALLATIE.md, GITHUB-INSTALLATIE.md, LEES-MIJ-VOLLEDIGE-VERSIE.md, CONTROLES.md en CHANGELOG.md zijn bijgewerkt.

## Validatie

Volledige `npm run ci` geslaagd op Node.js 22.23.4 / npm 10.9.9 en Node.js 24.22.1 / npm 11.9.0: op beide 20/20 testbestanden, inclusief syntax- en versiecontrole. Radio- en logregressies gebruiken gesimuleerde Discordverbindingen en tijdelijke databases. Geen live Discord-login of luistertest op de productiehosting uitgevoerd.

## Gewijzigde bestanden

- CHANGELOG.md
- CONTROLES.md
- GITHUB-INSTALLATIE.md
- HANDLEIDING.md
- INSTALLATIE.md
- LEES-MIJ-VOLLEDIGE-VERSIE.md
- LOGGING-HANDLEIDING.md
- MANUAL-EN.md
- RADIO-HANDLEIDING.md
- README.md
- locales/en.json
- package-lock.json
- package.json
- scripts/test-discord-audit.cjs
- scripts/test-radio.cjs
- services/discordAudit.js
- services/radioService.js
- utils/eventEmbeds.js
- utils/logNames.js
- UPDATE-3.2.0.md
