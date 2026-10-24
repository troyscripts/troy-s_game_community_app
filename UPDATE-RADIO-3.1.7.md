# Update 3.1.7 — Internetradio

Gebaseerd op het aangeleverde volledige pakket 3.1.6. Dit pakket bevat alle oorspronkelijke bronbestanden plus de radio-uitbreiding.

## Snel starten
Stop de bot, vervang de bestanden, voer `npm ci` uit en herstart op Node.js 24. Bewaar je bestaande `.env` en database. Plaats `/radio paneel` in de chat van je spraakkanaal. Selecteer een zender in de dropdown. Met `/leave` stopt de audio en verlaat de bot de call.

Zie RADIO-HANDLEIDING.md voor rechten, zenders en instellingen.

## Uitgevoerde controles
- Syntaxis en imports: 228 JavaScript-bestanden, 65 slashcommands.
- Versiecontrole: package, lockfile, defaults, README en changelog gelijk.
- Alle 20 regressietestbestanden geslaagd, inclusief de radiotests.
- Echte lokale FFmpeg → PCM → volumeregeling → Opus-pipeline geslaagd.
- Discordverbindingen in tests zijn nagebootst. Live luisteren via jouw bot en hosting is nog niet getest.

## Gewijzigd of toegevoegd
- `CHANGELOG.md`
- `RADIO-HANDLEIDING.md`
- `README.md`
- `buttons/radio.js`
- `commands/community/leave.js`
- `commands/community/radio.js`
- `config/defaults.js`
- `database/guildSettings.js`
- `index.js`
- `locales/en.json`
- `package-lock.json`
- `package.json`
- `scripts/test-radio.cjs`
- `selectmenus/radio.js`
- `services/radioPanel.js`
- `services/radioService.js`
