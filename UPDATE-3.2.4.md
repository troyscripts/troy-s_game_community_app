# Update 3.2.4

## Installatie

1. Stop de bot en maak een back-up van je bestanden en database.
2. Vervang de botbestanden door deze versie. Behoud je eigen `.env`, database en overige privégegevens.
3. Voer `npm ci` uit in de botmap. Dit installeert volgens de lockfile en verwijdert oude dependencies.
4. Voer `npm audit` uit en start de bot via je gebruikelijke hostinginstelling (`npm start`).

Geen nieuwe slash-commandregistratie nodig.

## Wijzigingen

- Ongebruikte glob-dependency verwijderd.
- Nodemon en de daardoor benodigde minimatch-dependency verwijderd; ontwikkeling via `npm run dev` gebruikt `node --watch index.js`. Geladen modules worden gevolgd; nieuwe bestanden kunnen een handmatige herstart vereisen.
- Node-eis blijft >=22.12.0; geschikt voor jouw Node 24.22.2.
- Better-sqlite3 behouden; prebuild-install kan nog een onderhoudswaarschuwing tonen.
- Eerdere bedrijvenfix inbegrepen: verkoop betaalt 75% van de waarde inclusief upgrades/beveiliging uit aan de bank en verwijdert het eigendom in één transactie.
- Versie in package, lockfile en documentatie verhoogd naar 3.2.4.

## Controle

Gecontroleerd met Node 24.22.1: `npm run ci` geslaagd (validatie, versies en 23/23 testbestanden). `npm audit` meldde 0 kwetsbaarheden op 4 november 2026. Geen live Discordverbinding getest.
