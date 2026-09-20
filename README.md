# Troy’s Game Community Bot — persoonlijke versie 2.4.8

Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen,
counting, agenda en optionele AI-chat. Deze persoonlijke variant bevat de
instellingen voor Troy’s Game Community en is bedoeld voor je eigen host.

## Nieuw in 2.4.8

Alleen Troy’s Game Community gebruikt `config/defaults.js` als actieve
serverconfiguratie. De server wordt geselecteerd met `DefaultsGuildId` in
`config/settingsSource.js`; jouw server staat daar al ingevuld.

Andere Discord-servers blijven hun eigen opgeslagen database-instellingen gebruiken.
De bestaande databaseconfiguratie van jouw server wordt genegeerd, maar niet gewist.
XP, economy, gebruikers, verjaardagen, tickets, selfrolpanelen en andere botdata
blijven gewoon in de database.

## Instellingen voor jouw server aanpassen

1. Pas de gewenste waarden aan in `config/defaults.js`.
2. Sla het bestand op en herstart de bot.
3. Controleer de wijziging met `/config bekijken` of `/config exporteren`.

`/config instellen`, `/config herstellen` en `/config resetten` verwijzen op jouw
server naar het bestand. Op andere servers blijven deze commands werken.
Ook het staffrolkeuzemenu kan jouw bestandsinstellingen niet overschrijven.

Let op: waarden in defaults.js bepalen nu ook of functies aanstaan. Controleer
bijvoorbeeld `Tickets.Enabled`, `AIChat.Enabled` en `AIChat.Channels` als je die
eerder alleen via Discord had ingesteld.

De Bot-opstartcontrole gebruikt `StartupReport.Enabled` en `StartupReport.Channel`.
De automatische changelogmelding gebruikt `Logging.Enabled` en `Logging.Channel`.
Dit zijn afzonderlijke instellingen.

## Terug naar database-instellingen

Zet in `config/settingsSource.js`:

```js
module.exports = {
    DefaultsGuildId: ""
};
```

Herstart de bot. De eerder opgeslagen serverinstellingen worden weer actief;
de bestandsinstellingen worden niet automatisch naar de database gekopieerd.

## Update installeren

Dit 2.4.8-updatepakket bevat alleen nieuwe of gewijzigde bestanden en vereist een
bestaande 2.4.7-installatie. Stop de bot en maak eerst een privébackup. Pak de update
uit in `/home/container` en voeg de mappen samen. Bewaar je huidige `.env`,
`config/defaults.js` en databasebestanden. Die worden niet meegeleverd of vervangen.
Gebruik de persoonlijke defaults uit de eerdere Troy-instellingen-versie.
Er zijn geen nieuwe dependencies nodig. Herstart daarna de bot.

Zie [INSTALLATIE-2.4.8.md](INSTALLATIE-2.4.8.md) en [CHANGELOG.md](CHANGELOG.md).

## GitHub-versiechecker

De repositorylink staat in `config/updates.js`:
https://github.com/troyscripts/troy-s_game_community_app

De bot controleert bij opstarten en iedere zes uur op een nieuwere stabiele
Latest-release. Een melding met downloadlink verschijnt in de console.
Updates worden niet automatisch geïnstalleerd. Een eventuele lokale waarde van
`GITHUB_REPOSITORY` in `.env` heeft voorrang op de link in het bestand.

De geïnstalleerde versie komt uit `package.json`. De automatische changelogfunctie
meldt 2.4.8 in het ingestelde logkanaal als logging aanstaat en het kanaal bereikbaar is.

Deze persoonlijke variant niet rechtstreeks openbaar uploaden: er staan eigen
Discord-ID’s in defaults.js en settingsSource.js. Gebruik voor GitHub een
opgeschoonde kopie, maak `DefaultsGuildId` daarin leeg en volg de publicatie-uitleg
in `GITHUB-INSTALLATIE.md`. De exportcontrole weigert persoonlijke ID’s bewust.

## Starten en controleren

- `npm start`: bot starten.
- `npm run check`: syntax, commandnamen en vereiste bestanden controleren.
- `npm run test:updates`: offline tests voor de GitHub-versiechecker.

Bij een nieuwe installatie zijn dependencies (`npm ci`) en een eigen ingevulde
`.env` nodig. Bewaar bij een bestaande installatie altijd je huidige `.env` en database.

Deze update is lokaal gecontroleerd op serverafscheiding, behoud van opgeslagen
instellingen en terugschakelen. Er is geen live Discord-test uitgevoerd.
