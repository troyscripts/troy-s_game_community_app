# Volledige bot — 3.4.2

## Update 3.4.2 — overheidstickets sluiten en verwijderen

Na bevestiging stuurt de bot het transcript naar het bestaande `Tickets.LogChannel` van deze server en verwijdert daarna direct het ticketkanaal. Bij een mislukte export of aflevering blijft het kanaal behouden. Geen nieuw logkanaal nodig; zie [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md).

## Update 3.4.1 — leesbare ticketkeuzes

Overheidspanelen tonen afdelingsnamen en een korte uitleg. Pas de uitleg aan met `omschrijving` samen met `instellen`. Gebruik het paneelcommando opnieuw in hetzelfde kanaal om een recent bestaand paneel bij te werken. Zie [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md). Node 24.x blijft vereist.

Dit pakket bevat de volledige bot met de vijf overheidspanelen, inclusief het eigen paneel voor de overheidscoördinator. Vanaf deze versie is **Node.js 24.x verplicht**. Node 22 wordt door de bot niet meer ondersteund.

## Bijwerken

1. Stop de bot; maak een back-up en bewaar `.env`, database, eigen configuratie en privébestanden in `data/`.
2. Zet je hostingprofiel op Node.js 24.
3. Kopieer de inhoud van `troy-s_game_community_app/` naar de bestaande bothoofdmap. Neem `.npmrc`, `package.json` en `package-lock.json` mee. Upload geen `node_modules`.
4. Voer `npm ci --no-audit --no-fund` uit onder Node 24, zonder `--ignore-scripts`.
5. Start de bot. Nieuwe databasetabellen en commandregistratie worden bij opstarten geregeld. Indien nodig: `npm run deploy`.

Zie [UPDATE-3.4.0.md](UPDATE-3.4.0.md) voor de volledige overstap, [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md) voor inrichting en [CONTROLES.md](CONTROLES.md) voor de testresultaten.

## Nieuwe installatie en publicatie

Volg [INSTALLATIE.md](INSTALLATIE.md). Maak een eigen `.env` op basis van `.env.example`. Publicatie-instructies staan in [GITHUB-INSTALLATIE.md](GITHUB-INSTALLATIE.md). Privégegevens horen niet in GitHub.
