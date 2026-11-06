# Versie 3.5.0 publiceren

## Eigen stafftickets (3.5.0)

Staff kan het eigen supportticket claimen en beheren. Voeg de benodigde persoon toe met `/ticket-add gebruiker:@persoon`. Die persoon kan meepraten, ook als het een gelijk of hoger stafflid is. Expliciete uitnodigingen blijven opgeslagen. Hogere claims/minimumrangen blijven gelden; hogere staff uitnodigen geeft geen recht om die te verwijderen. Gewone ticketmakers krijgen hiermee geen staffrechten.

## Update 3.5.0 — blijvend ticketarchief

Hoofd- en overheidstickets worden via kanaal-ID gevolgd, ook na verplaatsen. Ontvangen berichtversies, verwijdermeldingen en bijlagekopieën blijven in SQLite bewaard en staan duidelijk gemarkeerd in het transcript. Bestaande zichtbare geschiedenis wordt bij opstarten ingelezen. Eerder verdwenen of niet ontvangen inhoud is niet herstelbaar. Zie [TICKETARCHIEF.md](TICKETARCHIEF.md) voor rechten, opstartscan, opslag, exportgrenzen en back-ups. Node 24.x blijft vereist.

## Update 3.4.3 — hoofdtickets sluiten en verwijderen

Ook de Sluiten-knop en `/ticket-close` van het hoofdticketsysteem vragen bevestiging, sturen het gesprek naar `Tickets.LogChannel` en verwijderen daarna het kanaal. Aanwezig staffoverleg wordt eerst apart opgeslagen in `Tickets.ThreadLogChannel`. Bij mislukte logaflevering blijft het ticket behouden. Een mislukte DM blokkeert verwijderen niet als de logs zijn afgeleverd. Oude Verwijderen-knoppen blijven werken met dezelfde bevestiging.

## Update 3.4.2 — overheidstickets sluiten en verwijderen

Na bevestiging stuurt de bot het transcript naar het bestaande `Tickets.LogChannel` van deze server en verwijdert daarna direct het ticketkanaal. Bij een mislukte export of aflevering blijft het kanaal behouden. Geen nieuw logkanaal nodig; zie [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md).

## Update 3.4.1 — leesbare ticketkeuzes

Overheidspanelen tonen afdelingsnamen en een korte uitleg. Pas de uitleg aan met `omschrijving` samen met `instellen`. Gebruik het paneelcommando opnieuw in hetzelfde kanaal om een recent bestaand paneel bij te werken. Zie [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md). Node 24.x blijft vereist.

## Bestanden klaarzetten

1. Kopieer de inhoud van het volledige pakket naar de hoofdmap van de repository.
2. Neem de nieuwe overheidsticketbestanden, documentatie, `.github/workflows/check.yml`, `.npmrc`, `package.json` en `package-lock.json` over.
3. Upload geen `.env`, databases, `node_modules`, logs, back-ups, transcripten of privébestanden in `data/`. Gebruik de schone volledige ZIP als bron en controleer de bestanden vóór publicatie.
4. Gebruik Node.js 24.x. De GitHub-workflow ondersteunt vanaf 3.4.0 alleen Node 24.

## Controleren en publiceren

Voer in een schone testkopie `npm ci --no-audit --no-fund` en `npm run ci` uit. Commit en push daarna. Controleer in GitHub Actions dat **Botcontroles / Node.js 24** slaagt. Publiceer release `v3.5.0` met het bijbehorende hoofdstuk uit [CHANGELOG.md](CHANGELOG.md).

De versiechecker gebruikt `package.json`; `config/defaults.js` haalt daar de botversie uit. De repository staat in `config/updates.js`. Deze download publiceert niets automatisch.

## Hosting bijwerken

Zet vóór installatie het hostingprofiel op Node 24 en volg [UPDATE-3.4.0.md](UPDATE-3.4.0.md). Deze release voegt overheidsslashcommands en twee databasetabellen toe. Instellingen en panelen worden beschreven in [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md).
