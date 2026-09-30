# Creatormeldingen — 2.5.2

De bot controleert iedere vijf minuten nieuwe YouTube- en TikTok-video’s. Per creatoraccount stel je een Discordkanaal in. Meerdere creators mogen hetzelfde kanaal gebruiken; iedere Discordserver heeft eigen instellingen.

## Jouw accounts

Het updatepakket bevat `data/notify-presets.json`, met jouw YouTube- en TikTokaccount en het afgesproken kanaal. Kopieer ook dit bestand naar de bot. Zodra de bot het kanaal kan bereiken, worden beide accounts eenmalig ingesteld, alleen in de server van dat kanaal. Reeds aanwezige koppelingen worden niet overschreven. Latere wijzigingen en verwijderingen via Discord blijven behouden, ook na herstart.

YouTube probeert de @handle automatisch naar het vaste kanaal-ID te vertalen. Als YouTube dat tegenhoudt, toont `/notify lijst` wat er ontbreekt. Gebruik dan `/notify youtube-id id:<nummer> kanaal-id:<UC-ID>`. Het kanaal-ID vind je als eigenaar bij de geavanceerde accountinstellingen van YouTube. Hiervoor hoeft geen YouTube API-key ingesteld te worden.

TikTok staat vooraf ingesteld, maar blijft wachten totdat de creator zijn account koppelt. Een profiel-URL alleen geeft geen toegang tot de officiële TikTok API.

## Wie mag dit instellen?

Alleen de servereigenaar, gebruikers uit de bestaande globale Owner-/Developer-lijsten en leden met de ingestelde `Roles.HeadAdmin`, `Roles.Owner` of `Roles.Developer`. Alleen de Discord-permissie Administrator of een gewone staffrol geeft geen toegang. De serverrol-ID’s worden gebruikt, niet de rolnamen.

Een bevoegde configuratiebeheerder kan bijvoorbeeld `/config instellen instelling:Roles.HeadAdmin waarde:<rol-ID>` gebruiken. Het instellen van notify geeft Head Admin geen extra toegang tot andere beheercommands.

## Commands

- `/notify toevoegen platform:YouTube creator:https://www.youtube.com/@troys-game-community kanaal:#videos`
- `/notify toevoegen platform:TikTok creator:https://www.tiktok.com/@troysgamecommunity kanaal:#videos`
- `/notify lijst` — toont nummers, kanalen, laatste succesvolle controle en fouten; gebruik `pagina` voor meer creators.
- `/notify verwijderen id:<nummer>` — verwijdert deze koppeling en de bijbehorende meldingswachtrij uit deze Discordserver.
- `/notify test id:<nummer>` — plaatst een duidelijk gemarkeerd voorbeeld, zonder ping. Dit test Discord, niet of de platformkoppeling werkt.
- `/notify youtube-id id:<nummer> kanaal-id:<UC-ID>` — herstelt YouTube-herkenning als de handle niet kan worden opgehaald.

Met `toevoegen` op hetzelfde platform/account wijzig je het kanaal en de berichtinstellingen; de bestaande videohistorie blijft behouden. Gebruik steeds dezelfde handle of hetzelfde UC-ID, anders wordt dit als een apart creatoraccount gezien. Controleer vooraf `/notify lijst`.

Optioneel bij toevoegen: `pingrol` en `bericht`. Berichtvariabelen: `{creator}`, `{platform}`, `{titel}`, `{url}`. Weglaten van deze opties herstelt het standaardbericht zonder ping. De bot vermeldt alleen de expliciet gekozen rol; @everyone en andere mentions in titels/berichten worden niet geactiveerd. Kies een vermeldbare rol of geef de bot daarvoor de benodigde Discordrechten.

## Vier pingrollen

In `config/defaults.js` staan vier lege velden: `Notify.PingRole1`, `Notify.PingRole2`, `Notify.PingRole3` en `Notify.PingRole4`. De actieve rol-ID’s worden per server via Discord opgeslagen.

Een configuratiebeheerder stelt ze in met:

```text
/config instellen instelling:Notify.PingRole1 waarde:<rol-ID>
/config instellen instelling:Notify.PingRole2 waarde:<rol-ID>
/config instellen instelling:Notify.PingRole3 waarde:<rol-ID>
/config instellen instelling:Notify.PingRole4 waarde:<rol-ID>
```

Head Admin, Owner en Developer kunnen hiervoor ook `/notify pingrol nummer:1 rol:@YouTube` gebruiken; herhaal voor nummer 2, 3 en 4. Alleen dit notify-command geeft Head Admin toegang tot de vier pingrollen, niet tot de rest van `/config`.

Kies vervolgens bij `/notify toevoegen` de optie `pingkeuze:Pingrol 1` (of 2, 3, 4). Een latere wijziging aan die pingrol werkt automatisch door bij alle creators die deze keuze gebruiken. Een lege pingrol schakelt de ping voor die creators uit. Gebruik óf `pingkeuze` óf de bestaande optie `pingrol` voor één rechtstreeks gekozen rol. Er worden geen nieuwe Discordrollen aangemaakt en jouw vooraf ingestelde accounts pingen standaard niemand, omdat nog geen rol-ID’s zijn opgegeven.

## TikTok koppelen

Dit vraagt eenmalig technische inrichting door degene die de bot host. Iedere TikTok-creator moet zelf toestemming geven. Dit kan niet met alleen een gebruikersnaam of Discordcommand worden omzeild.

1. Maak een TikTok for Developers-app met goedgekeurde **Login Kit** en **Display API**. Vraag de scopes `user.info.basic`, `user.info.profile` en `video.list` aan. Sandbox-apps werken alleen voor de daar toegelaten testaccounts; voor andere creators is TikTok-goedkeuring nodig.
2. Registreer een HTTPS-redirect-URL op een pagina die je zelf beheert. Gebruik een eenvoudige pagina zonder analytics of externe scripts die de eenmalige code zouden kunnen ontvangen. De pagina hoeft de code niet automatisch te verwerken: de URL wordt hieronder handmatig teruggekopieerd. Gebruik exact die URL, zonder query of fragment.
3. Vul alleen in je eigen `.env` in:

   ```dotenv
   TIKTOK_CLIENT_KEY=
   TIKTOK_CLIENT_SECRET=
   TIKTOK_REDIRECT_URI=
   ```

4. Stop de bot. Open een interactieve terminal in de botmap en voer `npm run notify:tiktok` uit. Een hostingpaneel zonder interactieve terminal kan dit script niet zelfstandig doorlopen: voer het dan lokaal met Node.js 20+ en de botdependencies uit en plaats daarna het gemaakte koppelbestand op de host.
5. Open de getoonde toestemmingslink, of laat de betreffende creator deze openen. Na toestemming kopieer je de volledige terugkeer-URL uit de adresbalk naar de terminal. Die URL bevat een kort geldige code: deel hem uitsluitend privé met de beheerder die deze koppeling gestart heeft, nooit in een openbaar kanaal.
6. Het script controleert de beveiligingscode en de TikTok-gebruikersnaam. Tokens worden opgeslagen in `data/notify-tokens.json`. Kopieer bij een lokale koppeling dit bestand privé naar dezelfde locatie op de bot-host. Bewaar bestaande accounts wanneer je een volgend account koppelt; gebruik daarvoor de actuele kopie van het bestand.
7. Start de bot. Controleer `/notify lijst` na ongeveer vijf minuten. De bot vernieuwt tokens automatisch zolang TikTok dit toestaat. Bij ingetrokken of verlopen toestemming moet de creator opnieuw koppelen.

Het tokenbestand is privé, hoort niet op GitHub en wordt niet door de gewone SQLite-back-up meegenomen. Bewaar hiervan een beveiligde back-up. `/notify verwijderen` stopt meldingen in de huidige Discordserver, maar trekt geen toestemming in: hetzelfde account kan in andere servers gebruikt worden. Toestemming intrekken kan de creator via zijn TikTok-accountinstellingen.

## Gedrag en grenzen

- De eerste succesvolle controle legt een beginpunt vast. Bestaande video’s worden dan niet gepost; pas daarna verschijnen nieuwe uploads. Dit geldt ook wanneer TikTok later voor het eerst gekoppeld wordt.
- Bij normale herstarts onthoudt de bot welke video’s al gemeld zijn. Bij een mislukt Discordbericht blijft de video in de databasewachtrij staan. Na herstel probeert hij opnieuw, maximaal tien berichten per creator per controleronde.
- Bij fouten wordt de controle tijdelijk vertraagd, tot maximaal één uur. Opnieuw opslaan via `/notify toevoegen` haalt die wachttijd weg. De status staat in `/notify lijst`; herhaalde identieke fouten vervuilen de console niet iedere vijf minuten.
- YouTube RSS bevat een beperkt aantal recente items (doorgaans vijftien). Na langdurige uitval of zeer veel uploads kunnen oudere items uit de feed verdwenen zijn en gemist worden. De feed kan vertraging hebben. Alleen video’s die het platform beschikbaar stelt zijn zichtbaar.
- YouTube Shorts worden meegenomen wanneer ze in de videofeed voorkomen. Er is in deze versie geen afzonderlijke detectie voor het moment waarop een livestream begint. Een stream kan wel als video in de feed verschijnen.
- TikTok-video’s worden via de officiële API opgehaald; TikTok LIVE, Stories, foto-posts en Twitch zijn niet opgenomen in deze eerste versie.
- Het kanaal moet een tekst- of aankondigingskanaal zijn met Kanaal bekijken, Berichten verzenden en Links insluiten voor de bot. Aankondigingen worden niet automatisch gecrosspost.
- De bot moet draaien. Een zeldzame crash tussen een geslaagde Discordverzending en de databasebevestiging kan nog een dubbele melding geven; Discord-nonces verkleinen dit risico, maar gelden slechts een korte tijd.

## GitHub

`npm run prepare:github` exporteert de nieuwe code en handleiding. Het privé-tokenbestand en jouw persoonlijke startinstellingen blijven buiten deze export. Installeer `data/notify-presets.json` eenmalig rechtstreeks op de host; daarna staan de koppelingen in de bestaande database en beheert `/notify` ze. Gebruik bij deze update geen oudere volledige database of `.env` uit een ander pakket.

## Bronnen voor de koppeling

- https://developers.tiktok.com/docs/en/display-api-get-started
- https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-list
- https://developers.tiktok.com/docs/en/oauth-user-access-token-management


## Verbindingsdiagnose vanaf 2.5.3

De basiscontrole draait iedere vijf minuten. Bij fouten loopt de wachttijd per creator op van 5 naar 10, 20, 40 en maximaal 60 minuten. Tijdelijke GET-verbindingsfouten en HTTP 502/503/504 krijgen eerst één extra poging na 750 milliseconden, met maximaal 20 seconden per poging. Een extra poging herhaalt geen Discordmelding.

Waarschuwingen tonen de betrokken host en, indien beschikbaar, de foutcode. `ENOTFOUND`/`EAI_AGAIN` wijzen op naamresolutie; `ETIMEDOUT`/`UND_ERR_CONNECT_TIMEOUT`/`TIMEOUT` op een verlopen aanvraag; `ENETUNREACH` op een onbereikbaar netwerk. HTTP 403 of 429 betekent dat het platform de aanvraag weigert of beperkt. Deel bij aanhoudende problemen de nieuwe waarschuwing met je hoster. Een code is een aanwijzing, geen bewijs van de precieze oorzaak.

Een geweigerde externe doorverwijzing wordt niet gevolgd. Als het om het opzoeken van een YouTube-handle gaat, kun je met `/notify youtube-id` het juiste UC-kanaal-ID instellen. Een directe ID lost een geblokkeerde feedverbinding niet op.

Na herstel verschijnt een informatieregel. TikTok blijft wachten totdat het account toestemming heeft gegeven. Video’s van vóór de eerste geslaagde controle worden, zoals voorheen, als historie overgeslagen.


### Correctie 2.5.3 (zelfde versienummer)

YouTube-aanvragen sturen nu een vaste anonieme cookievoorkeur (`SOCS=CAI`, akkoord) mee. Er worden geen persoonlijke browsercookies of accountgegevens gebruikt of opgeslagen. De hostbeperking voor doorverwijzingen blijft actief. Dit is geen YouTube-login en omzeilt geen toegangsrechten. Als een cookiepagina toch blijft verschijnen, vermeldt de waarschuwing de doelhost en kun je het UC-kanaal-ID via `/notify youtube-id` instellen.

De versiechecker had daarnaast een fout in de loggeraanroep. `Cannot read properties of undefined (reading 'write')` kon daardoor verschijnen nadat GitHub al succesvol was uitgelezen; deze aanroep is hersteld.

De YouTube-feed kan het kanaal-ID zonder `UC` teruggeven. De vergelijking ondersteunt nu beide schrijfwijzen en controleert nog steeds exact het ingestelde kanaal.
