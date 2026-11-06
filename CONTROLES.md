# Automatische controles — 3.4.2

## Aanvullende controles voor 3.4.2

De volledige `npm run ci` is geslaagd op Node 24.22.1: syntax/bestanden, versies en **25/25 testbestanden**. Nieuwe regressietests controleren ontbrekende/ongeldige logkanalen, logkanaal op de verkeerde server, onvoldoende rechten, exportfouten, uploadfouten en verwijderfouten. Er wordt pas verwijderd na een geslaagde transcriptupload; een nieuwe poging exporteert opnieuw. De overheidstest controleert ook de sluitactie via de echte componenthandler. Node 24.x en dependencies zijn ongewijzigd.

## Aanvullende controles voor 3.4.1

Gerichte overheidstests controleren dat rolmentions als echte namen verschijnen, onbekende rollen terugvallen op een afdelingsnaam, aangepaste omschrijvingen behouden blijven en een bestaand paneel wordt bijgewerkt zonder een dubbel paneel te plaatsen. De bestaande rechten- en tickettests in hetzelfde testbestand blijven slagen. Syntax, versies en de opstarttest zijn opnieuw gecontroleerd. De volledige schone-installatiecontrole hieronder hoort bij 3.4.0; dependencies en Node-vereisten zijn in 3.4.1 niet gewijzigd.

## Ondersteuning

Vanaf 3.4.0 ondersteunt deze bot alleen Node.js 24.x. `package.json`, de root in `package-lock.json` en `.npmrc` (`engine-strict=true`) leggen dit vast. GitHub Actions installeert en controleert de bot op Node 24. Oude resultaten voor Node 22 horen bij eerdere releases en zijn geen actuele ondersteuningsbelofte.

## Uitgevoerde controles op 6 november 2026

- Schone installatie met `npm ci --no-audit --no-fund`, inclusief installatiescripts, op Node.js 24.22.1 / npm 11.9.0.
- De volledige `npm run ci`: syntax/bestanden, versies en alle 24 testbestanden.
- Opstarttest zonder Discord-login: tijdelijke SQLite-database en 71 unieke slashcommands.
- Nieuwe overheidstests: server- en afdelingsscheiding, expliciete kanaalrechten, toegang zonder staffrol, geweigerde stafftoegang, dubbele tickets, claimconflicten, sluiten en opgeslagen toegangslijsten. Het coördinatorpaneel heeft een eigen configuratie en toegangslijst.
- Native SQLite schrijft en leest succesvol; echte PCM-naar-Opus-encoding geeft uitvoer; de geïnstalleerde FFmpeg 7.0.2 start met `-version`.
- Node.js 22.23.4: `npm ci --dry-run` wordt met de bedoelde `EBADENGINE`-melding geweigerd door de nieuwe versiegrens.
- Lokale Markdown-links gecontroleerd; ontbrekende historische updatebestanden verwijzen nu naar de meegeleverde changelog.

De npm-waarschuwing dat `prebuild-install` niet meer onderhouden wordt, blijft afkomstig van de dependencyketen van `better-sqlite3`; de installatie en SQLite-controle slagen. Dit is geen npm-installatiefout en is niet verborgen of weggefilterd. Een dependency-audit maakt geen onderdeel uit van deze compatibiliteitscontrole.

## Zelf controleren

Gebruik een schone testkopie zonder productiegegevens, onder Node 24:

```sh
node --version
npm ci --no-audit --no-fund
npm run ci
```

`npm run check` controleert JavaScript-syntax, commandnamen, vereiste bestanden, lokale imports en vertaal-JSON. `npm run check:versions` vergelijkt package, lockfile, configuratie, README en changelog. `npm test` ontdekt de testbestanden automatisch en draait elk in een apart proces met een timeout.

De tests gebruiken tijdelijke databases en gesimuleerde API-antwoorden. Er zijn geen Discord-token, echte botlogin, commandodeploy of publicatie gebruikt. Live Discordrechten, instellingen van jouw hosting, radioverbindingen en externe providerbereikbaarheid moeten daar nog worden gecontroleerd. Een geslaagde testreeks garandeert niet dat iedere externe dienst beschikbaar is.

## GitHub en nieuwe releases

Neem `.github/workflows/check.yml` en `.npmrc` mee. Controleer na push **Botcontroles / Node.js 24** in Actions. De download wordt niet automatisch gepusht. Werk bij een nieuwe release package, lockfile, README, changelog, de Nederlandse en Engelse handleidingen en geraakte installatie-/functiehandleidingen bij. Historische changelogversies blijven intact.
