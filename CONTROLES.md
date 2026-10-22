# Automatische controles

GitHub voert de workflow **Botcontroles** uit bij iedere push en pull request, op Node.js 22 en 24. De controle installeert met `npm ci` exact de lockfile en draait `npm run ci`. Een fout geeft een rode controle in GitHub Actions. Dit blokkeert een push niet; verplichte mergecontroles zijn een afzonderlijke repositoryinstelling.

## Lokaal uitvoeren

Gebruik een schone checkout/testkopie zonder productiegegevens:

```sh
npm ci
npm run ci
```

- `npm run check`: JavaScript-syntax, dubbele commandnamen, vereiste bestanden, lokale imports en vertaal-JSON.
- `npm run check:versions`: package, beide lockfileversies, globale configuratie, README-titel en eerste changeloghoofdstuk.
- `npm test`: ontdekt alle `scripts/test-*.js` en `scripts/test-*.cjs`, start elk bestand in een afzonderlijk proces, toont alle fouten en stopt met foutcode als een test faalt. Per bestand geldt maximaal 120 seconden.

De tests omvatten economy/store/resets, woningen, bedrijven, leningen, talen, verjaardagen, tickets, softmoderatie, honeypot, creator-meldingen, Groq, netwerkfoutafhandeling, updatechecker, transcriptlimieten en opstartonderdelen. De opstarttest initialiseert een tijdelijke SQLite-database en laadt de echte slashcommand-builders.

Er worden geen Discord-token of GitHub Actions-secrets gebruikt. Er is geen botlogin, commandodeploy of publicatie. De tests gebruiken testdatabases en gesimuleerde API-antwoorden. Ze bewijzen geen live Discord-rechten, bereikbaarheid van providers of correcte instellingen op jouw hosting.

## Nieuwe release

Werk package.json, de twee rootversies in package-lock.json, de README-titel en het eerste changeloghoofdstuk bij. De globale config haalt de botversie al uit package.json. Oude versies in historische changelogteksten mogen blijven staan.

## GitHub Desktop

Neem de volledige `.github`-map mee. Open na Push origin de Actions-tab van de repository en controleer beide Node.js-jobs. De workflow verschijnt pas na upload; deze download is niet automatisch gepusht.
