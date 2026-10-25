# Automatische controles

## Controle van 3.1.9

- Node.js 22.23.4 / npm 10.9.9: schone installatie geslaagd; alle 20 testbestanden geslaagd, met gerichte herhaling van de aangepaste platform- en radiotest.
- Node.js 24.22.1 / npm 11.9.0: schone installatie en volledige `npm run ci` geslaagd, 20/20 testbestanden; laatste radio-aanpassing opnieuw getest.
- Echte PCM-naar-Opus-encoding gecontroleerd op beide Node-versies.
- Radioverbindingen en platformantwoorden zijn in regressietests gesimuleerd. Geen live Discord-login of luistertest op jouw hosting uitgevoerd.

De lockfile bevat de ontbrekende optionele `opusscript@0.0.8`-dependency naast de bestaande directe 0.1.1-versie. Bij die specifieke installatiefout moeten beide packagebestanden uit 3.1.9 worden overgenomen.

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

Werk package.json, de twee rootversies in package-lock.json, de README-titel en het eerste changeloghoofdstuk bij. De globale config haalt de botversie al uit package.json. Oude versies in historische changelogteksten mogen blijven staan. Werk ook README, HANDLEIDING.md, MANUAL-EN.md en alle geraakte functie- en installatiehandleidingen bij. Controleer versiekoppen, voorbeelden, installatie-instructies en lokale bestandslinks; alleen de changelog bijwerken is niet voldoende. Een documentatiecorrectie vóór publicatie hoeft de botversie niet te verhogen.

## GitHub Desktop

Neem de volledige `.github`-map mee. Open na Push origin de Actions-tab van de repository en controleer beide Node.js-jobs. De workflow verschijnt pas na upload; deze download is niet automatisch gepusht.
