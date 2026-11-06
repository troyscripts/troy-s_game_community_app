# Update 3.4.0 — Node.js 24 en overheidstickets

Vanaf deze release ondersteunt de bot uitsluitend Node.js **24.x**. Node 22 krijgt vanuit dit project geen ondersteuning meer; Node zelf onderhoudt die release nog tot 30 april 2027. Hogere majorversies, zoals Node 25/26, zijn voor deze bot niet gevalideerd en vallen buiten de opgegeven versiegrens.

## Installatie op Pterodactyl / bot-hosting

1. Stop de bot en maak een privéback-up. Bewaar `.env`, je SQLite-database (en eventuele WAL/SHM-bestanden), bestaande configuratie en eigen bestanden in `data/`.
2. Kies in je hostingpaneel een **Node.js 24**-image/startupprofiel. Kan dit niet, laat je host dit aanpassen voordat je deze release installeert.
3. Upload de inhoud van de pakketmap naar de bothoofdmap. `package.json` moet direct in `/home/container/` staan, niet in een extra submap. Neem ook `.npmrc` en beide packagebestanden over.
4. Voer `npm ci --no-audit --no-fund` uit onder Node 24. Dit vervangt `node_modules` en installeert native onderdelen zoals `better-sqlite3` voor die runtime. Upload geen oude of Windows-`node_modules`. Gebruik geen `--ignore-scripts`.
5. Controleer de installatielog en start met `npm start`. Controleer `/ping` en de nieuwe overheidspanelen. De bot registreert slashcommands bij opstarten; zo nodig `npm run deploy`.

Bij een ongeschikte Node-versie weigert npm de installatie met `EBADENGINE`. Kies dan Node 24; schakel de versiecontrole niet uit. De `.npmrc` geldt bij installatie, niet als runtimecontrole voor een al geïnstalleerde bot.

## Inbegrepen functies

- Eigen panelen voor `/politie`, `/ambulance`, `/pechhulp`, `/brandweer` en `/overheidscoordinator`.
- Per afdeling eigen Discord-rollen, verantwoordelijke personen en ontvangstcategorie.
- Instellen en publiceren door Head Admin of hoger; behandelen vereist alleen expliciete afdelingsrechten, geen staffrol.
- Claimen, privétranscript downloaden en sluiten met bevestiging. Gesloten kanalen blijven als archief bestaan.
- Nieuwe tabellen `government_departments` en `government_tickets` worden automatisch aangemaakt. Bestaande tickets en serverinstellingen blijven behouden.
- Geen nieuwe secrets of verplichte `.env`-variabelen. Afdelingen zijn standaard uitgeschakeld tot ze zijn ingesteld.

Zie [OVERHEID-TICKETS.md](OVERHEID-TICKETS.md) voor de inrichting en [CONTROLES.md](CONTROLES.md) voor de uitgevoerde verificatie. Er is geen live Discord-login of hostingtest uitgevoerd.
