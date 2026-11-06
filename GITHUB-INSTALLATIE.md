# Versie 3.4.0 publiceren

## Bestanden klaarzetten

1. Kopieer de inhoud van het volledige pakket naar de hoofdmap van de repository.
2. Neem de nieuwe overheidsticketbestanden, documentatie, `.github/workflows/check.yml`, `.npmrc`, `package.json` en `package-lock.json` over.
3. Upload geen `.env`, databases, `node_modules`, logs, back-ups, transcripten of privébestanden in `data/`. Gebruik de schone volledige ZIP als bron en controleer de bestanden vóór publicatie.
4. Gebruik Node.js 24.x. De GitHub-workflow ondersteunt vanaf 3.4.0 alleen Node 24.

## Controleren en publiceren

Voer in een schone testkopie `npm ci --no-audit --no-fund` en `npm run ci` uit. Commit en push daarna. Controleer in GitHub Actions dat **Botcontroles / Node.js 24** slaagt. Publiceer release `v3.4.0` met het bijbehorende hoofdstuk uit [CHANGELOG.md](CHANGELOG.md).

De versiechecker gebruikt `package.json`; `config/defaults.js` haalt daar de botversie uit. De repository staat in `config/updates.js`. Deze download publiceert niets automatisch.

## Hosting bijwerken

Zet vóór installatie het hostingprofiel op Node 24 en volg [UPDATE-3.4.0.md](UPDATE-3.4.0.md). Deze release voegt overheidsslashcommands en twee databasetabellen toe. Instellingen en panelen worden beschreven in [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md).
