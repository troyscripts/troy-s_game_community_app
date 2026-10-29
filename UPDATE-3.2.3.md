# Update naar 3.2.3

## Installeren vanaf 3.2.2

1. Stop de bot en wacht tot het proces gestopt is.
2. Maak een back-up van `.env`, `database/database.sqlite` (en eventuele `-wal`/`-shm`-bestanden), eigen `data/`-bestanden en transcripts.
3. Pak het pakket uit en vervang de applicatiebestanden op dezelfde paden. Neem ook de nieuwe `services/logFilter.js` en `services/notify/youtubeApi.js` mee. Behoud je echte `.env`, SQLite-database en persoonlijke bestanden. `config/defaults.js` moet wel worden vernieuwd; opgeslagen `/config`-instellingen blijven in de database bewaard.
4. Voeg alleen indien gewenst `YOUTUBE_API_KEY=` uit `.env.example` toe aan je echte `.env`.
5. Start de bot en controleer versie 3.2.3. Nieuwe instellingen worden met bestaande serverinstellingen samengevoegd; de logtabel krijgt automatisch een nullable metadatakolom.

Geen nieuwe dependencies en geen wijziging aan de slashcommandstructuur: vanaf 3.2.2 is opnieuw registreren niet nodig. Bij een eerste installatie: volg INSTALLATIE.md.

## Minder berichtlogs

Deze instellingen gelden per Discord-server en werken direct na opslaan:

| Instelling | Werking | Standaard |
| --- | --- | --- |
| `Logging.IgnoreBots` | Berichtlogs van alle bots én webhooks overslaan | `nee` |
| `Logging.IgnoredAuthors` | Berichten van geselecteerde gebruikers/bots overslaan | lege lijst |
| `Logging.IgnoredUserMentions` | Berichten waarin geselecteerde gebruikers/bots worden vermeld overslaan | lege lijst |
| `Logging.IgnoredRoleMentions` | Berichten waarin geselecteerde rollen worden vermeld overslaan | lege lijst |

Voorbeelden (vervang de voorbeeldmentions door echte selecties):

```text
/config instellen instelling:Logging.IgnoreBots waarde:ja
/config instellen instelling:Logging.IgnoredAuthors waarde:@BotEen,@BotTwee
/config instellen instelling:Logging.IgnoredUserMentions waarde:@Gebruiker
/config instellen instelling:Logging.IgnoredRoleMentions waarde:@Rol
/config instellen instelling:Logging.IgnoredAuthors waarde:geen
```

Een lijst accepteert maximaal 100 ID's of mentions, gescheiden door komma's. `geen` wist de lijst. Iedere filter werkt afzonderlijk: één overeenkomst is voldoende om de berichtlog over te slaan. Alle bots uitsluiten is optioneel; voor uitsluitend specifieke bots laat je IgnoreBots op nee en vul je IgnoredAuthors in.

De filters gelden voor geplaatste, gewijzigde en verwijderde berichten. Bij bewerkingen worden zowel oude als nieuwe tekst en mentions bekeken. Bij bulkverwijdering worden bekende uitgesloten berichten niet meegeteld of vermeld. De filters gebruiken Discord-mentions en de berichttekst, niet los geschreven namen, rollen van de auteur of tekst in embeds. Ontbrekende afzender-/inhoudsgegevens bij ongecachete verwijderingen kunnen niet worden herkend en blijven gelogd.

Moderatie, honeypot, auditacties, voice, presence, reacties en overige eventcategorieën blijven actief. Die categorieën zijn al afzonderlijk uit te zetten via `Logging.Events.<categorie>`.

Nieuwe uitgesloten berichten komen niet in de logwachtrij. Bij nieuwe wachtrijregels wordt het filter vóór verzenden opnieuw gecontroleerd. Wachtrijregels van vóór deze update missen die metadata en kunnen nog worden afgeleverd; de update wist bestaande logs niet.

## Vastgezette berichten

De geïnstalleerde discord.js-versie geeft een numerieke timestamp door bij channelPinsUpdate. De oude bot gebruikte daarop direct toISOString(). De nieuwe code ondersteunt getallen, Date-objecten, ISO-tekst en ontbrekende/ongeldige waarden. Een onbekend tijdstip wordt als onbekend gelogd; de logactie blijft werken.

## YouTube

De bestaande RSS-controle probeert twee YouTube-hosts met retries. De aangeleverde logs laten afwisselend HTTP 404/500 en geslaagde controles zien. Daaruit volgt niet dat alle kanaal-ID's fout zijn. Zonder toegang tot de live host is de externe oorzaak niet vastgesteld.

Nieuw:
- Een waarschuwing maximaal eenmaal per uur per koppeling, ook als er tussendoor kort herstel was. Retrybackoff blijft behouden.
- Een herstelbericht pas na drie opeenvolgende geslaagde controles/afleverpogingen; dit betekent niet dat er drie video's zijn verstuurd.
- Optionele fallback via de officiële YouTube Data API v3 wanneer RSS ophalen/parsen mislukt. De fallback gebruikt hetzelfde kanaal-ID, controleert identiteit/publicatiedatum en haalt maximaal de laatste 50 uploads op. Bestaande deduplicatie en eerste-startbaseline blijven behouden. Dit is geen onbeperkte historische synchronisatie.

Voor de fallback:
1. Activeer **YouTube Data API v3** in je Google Cloud-project.
2. Maak een API-sleutel en beperk deze tot die API; pas eventuele IP-beperkingen aan het uitgaande IP van de hosting aan.
3. Zet `YOUTUBE_API_KEY=jouw_sleutel` in de echte `.env` en herstart.
4. Controleer API-quota in Google Cloud. De uploadlijst wordt zes uur gecachet; playlistaanvragen verbruiken quota. Een ongeldige sleutel, quota- of API-fout wordt gelogd en nooit als een lege geslaagde feed verwerkt.

Zonder sleutel blijft RSS actief, inclusief minder logspam. De update kan externe RSS-storingen niet garanderen op te lossen. De sleutel wordt als HTTP-header verzonden en niet in diagnostische URL's opgenomen.

Officiële uitleg: https://developers.google.com/youtube/v3/getting-started en https://developers.google.com/youtube/v3/docs/playlistItems/list

## Verbinding / hosting

In het aangeleverde bestand van 28 oktober staan 13 reconnects en 13 hervattingen, met gatewaymetingen van 125–141 ms. De oude eventloopmeting meldt 0–1 ms, maar meet alleen timerafwijking per minuut en sluit korte blokkades niet uit. Deze gegevens bewijzen geen hostingprobleem.

Nieuwe diagnose:
- Herkent de bekende librarymelding dat Discord zelf om een reconnect vraagt.
- Herkent een ontbrekend heartbeat-antwoord; dit kan bij netwerk-, Discord- of procesproblemen passen.
- Noteert veilige shard-netwerkfoutcodes, maximale gemeten eventloopvertraging en tijd tot hervatten.
- Logt nooit de volledige debuguitvoer, sessiegegevens of tokens. Onbekende oorzaken blijven expliciet onbekend.

Bij nieuwe uitval zijn de diagnose plus het tijdstip bruikbaar om te vergelijken met CPU/RAM/netwerkgegevens in je hostingpaneel. Een ontbrekend heartbeat-antwoord alleen wijst de hosting niet definitief aan. Herkenning van library-debuglabels is aanvullend en kan bij een toekomstige dependencywijziging terugvallen op onbekend.

Radio 10, TikTok en afsluitgedrag zijn in deze update niet gewijzigd.
