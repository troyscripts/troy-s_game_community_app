# Discordlogs en 18+-moderatie — 3.1.6

## Installatie

Stop de bot, maak een back-up, kopieer het volledige pakket inclusief submappen,
behoud `.env`, eigen configuratie, database en transcripts. Start opnieuw.
Registreer het nieuwe `/logs`-commando met `npm run deploy`.
Bestaande serverinstellingen blijven bewaard; nieuwe instellingen krijgen hun standaardwaarde.
Neem de nieuwe `config/defaults.js` over; vervang die niet door de oude versie.
Eventuele eigen wijzigingen in dat bestand kun je in de nieuwe versie terugzetten.

## Loglocaties instellen

Gebruik afgeschermde staffkanalen: logs kunnen berichten uit besloten kanalen
bevatten. De bot verandert de zichtbaarheid van je gekozen logkanalen niet.

```text
/config instellen instelling:Logging.Channel waarde:#bot-logs
/config instellen instelling:Logging.Channels.Messages waarde:#berichten-log
/config instellen instelling:Logging.Channels.MessageEdits waarde:#bewerkingen-log
/config instellen instelling:Logging.Channels.MessageDeletes waarde:#verwijderingen-log
/config instellen instelling:Logging.Channels.Voice waarde:#voice-log
/config instellen instelling:Logging.Channels.Moderation waarde:#moderatie-log
/config instellen instelling:Logging.Channels.Audit waarde:#audit-log
```

Een leeg categorie-kanaal gebruikt `Logging.Channel`. Zonder beide bestemmingen
worden voor die categorie geen gegevens opgeslagen. Een onbereikbaar ingesteld
kanaal valt NIET stilzwijgend terug op een ander kanaal. Corrigeer de instelling
en gebruik `/logs opnieuw` voor mislukte verzendingen.
Alle locaties en aan/uit-instellingen gelden uitsluitend voor de huidige server.

| Categorie (`Logging.Channels.…`) | Gebeurtenissen |
|---|---|
| Messages | Nieuwe berichten van leden, andere bots en webhooks; eigen botberichten uitgesloten tegen loglussen |
| MessageEdits | Gewijzigde tekst en wijziging in aantal bijlagen, oude inhoud indien gecachet |
| MessageDeletes | Verwijderde berichten en bulkverwijderingen; bij bulk de eerste 50 ID's |
| Reactions | Toevoegen/verwijderen van reacties en verwijderen van alle reacties |
| Members | Binnenkomen, vertrek, nickname, screening, boost en time-outwijzigingen |
| Roles | Rollen maken/wijzigen/verwijderen, rollen van leden |
| Channels | Kanalen, instellingen, rechten en wijzigingen aan vastgezette berichten |
| Threads | Threads maken/wijzigen/verwijderen, archiveren, ledenwijzigingen die Discord doorgeeft |
| Voice | Join/leave/verplaatsen, mute/deafen, stream/camera en stage-instellingen |
| Moderation | Geregistreerde warns, bans/unbans, time-outs, kicks/prunes en moderatorverplaatsingen via auditgegevens |
| Invites | Uitnodigingen maken/verwijderen; geen betrouwbare toewijzing van gebruikte invite aan elke join |
| Server | Servernaam, beschrijving, pictogram/banner en diverse serverinstellingen |
| Expressions | Emoji's, stickers en soundboard-items |
| ScheduledEvents | Evenementen, status/tijden en deelname |
| Integrations | Webhook-/integratiewijziging; precieze beheeractie indien beschikbaar onder Audit |
| AutoMod | Discord AutoMod-regels en acties (los van de eigen softmoderatie) |
| Commands | Eigen botcommands, knoppen en formulieren, zonder argumenten/antwoorden |
| Audit | Door Discord geleverde auditacties met uitvoerder-ID, doel, reden en wijzigingen |
| Presence | Online-status, indien de presence-intent is ingeschakeld |
| Typing | Discordmelding dat iemand begint te typen; geen ongezonden tekst |
| Polls | Stem toevoegen/verwijderen wanneer Discord dat voor de bot beschikbaar maakt |

Uitschakelen per categorie:

```text
/config instellen instelling:Logging.Events.Typing waarde:nee
/config instellen instelling:Logging.Events.Messages waarde:nee
```

`Logging.Enabled` is de hoofdschakelaar. `Logging.MessageDelete` blijft ook
werken als bestaande schakelaar voor verwijderlogs. Alle nieuwe categorieën
staan standaard aan, maar vereisen een categorie- of standaardlogkanaal.

## Bestaande specifieke logs

Deze locaties blijven afzonderlijk instelbaar; ze worden niet vervangen door
het algemene logkanaal:

- `Tickets.LogChannel`: ticketmeldingen en gewone transcripten.
- `Tickets.ThreadLogChannel`: vertrouwelijke staffthread-transcripten.
- `SoftModeration.LogChannel`: beoordeling, waarschuwingen en 18+-acties.
- `Honeypot.LogChannel`: honeypotmeldingen.
- `StartupReport.Channel`: opstartrapport.

## Controleren en herstellen

- `/logs status`: locaties, kanaalrechten en aantallen pending/sent/failed/cancelled.
- `/logs test categorie:Voice`: test voor één categorie; geen serveractie nodig.
- `/logs opnieuw`: mislukte verzendingen van deze server opnieuw inplannen.

De logwachtrij wordt in dezelfde SQLite-database als de bot opgeslagen en overleeft
herstarts. De bot probeert een verzending maximaal vijf keer. Fouten staan in
de console; na herstel kan `/logs opnieuw` helpen. Oude pending logs volgen de
huidige kanaalinstelling. Uitgeschakelde categorieën annuleren pending verzendingen.
De verzending gebruikt een nonce tegen korte dubbele sends, maar precies-éénmaal
bezorgen kan bij crashes/netwerkonderbreking niet absoluut worden gegarandeerd.

Standaardbewaring: `Logging.RetentionDays = 30`, `Logging.MaxRecords = 50000`
per server, `Logging.QueueLimit = 5000` pending. Dit zijn `/config`-instellingen.
Boven de wachtrijlimiet blijven nieuwe records lokaal als failed; bij overschrijding
van bewaartermijn of MaxRecords worden de oudste records verwijderd, ook als ze
nog niet verzonden waren. SQLite verwijderen verkleint het databasebestand niet
automatisch. Reeds geplaatste Discordlogberichten worden niet automatisch verwijderd.
Drukke servers kunnen de bezorgsnelheid overschrijden; monitor `/logs status`.

## Rechten en grenzen van Discord

Geef de bot View Channel, Send Messages, Embed Links en zo nodig Send Messages
in Threads. Voor auditacties: View Audit Log. Voor invites en bepaalde beheer-
events gelden de relevante Discordrechten. Voor verwijderen: Manage Messages.
Server Members Intent en Message Content Intent moeten in de Developer Portal
actief zijn. De bot vraagt die al aan, tenzij `MESSAGE_CONTENT_INTENT=false`.

Online-status is optioneel: zet Presence Intent aan in de Developer Portal én
`PRESENCE_INTENT=true` in `.env`, en herstart. Dit is een procesbrede Discord-
inloginstelling; het bestemmingskanaal en aan/uit blijven via `/config` gaan.
Bij bots waarvoor Discord goedkeuring vereist, moet die ook verleend zijn.

De bot kan niet letterlijk alles zien: geen privé-DM's tussen andere mensen,
ongezonden tekst, gesproken audio, inhoud uit onbereikbare kanalen of gebeurtenissen
van terwijl hij offline was. Verwijderde/niet-gecachete inhoud en oude waarden zijn
soms onbekend. Er wordt geen uitvoerder geraden op basis van de laatste auditregel;
het afzonderlijke Audit-log bevat alleen de uitvoerder die Discord zelf aangeeft.
Velden worden begrensd voor Discord-embedlimieten; dit is geen volledig transcript.

Officiële referenties:
https://docs.discord.com/developers/events/gateway
https://docs.discord.com/developers/resources/audit-log

## 18+-inhoud automatisch verwijderen en waarschuwen

```text
/config instellen instelling:SoftModeration.Enabled waarde:ja
/config instellen instelling:SoftModeration.LogChannel waarde:#botmoderatie
/config instellen instelling:SoftModeration.AdultContent waarde:ja
/config instellen instelling:SoftModeration.ScanImages waarde:ja
```

Een geldige `GROQ_API_KEY` in `.env` is nodig. Tekst gebruikt het bestaande
`GROQ_MODEL`; afbeeldingen gebruiken `SoftModeration.VisionModel`, standaard
`qwen/qwen3.8-27b` volgens de actuele Groq-visiondocumentatie. Toegang, beschikbaarheid
of limieten van je Groq-account kunnen verschillen; test in je server.
Geselecteerde berichttekst en afbeeldings-URL's worden voor beoordeling naar Groq
verzonden. De bot downloadt of bewaart zelf geen afbeeldingskopie.

Bij duidelijk herkende expliciet seksuele inhoud, vanaf
`SoftModeration.AdultMinConfidence` (standaard 0,95):

1. Een beoordeling wordt in het staffkanaal vastgelegd.
2. Het betreffende bericht wordt verwijderd.
3. Eén echte warn wordt opgeslagen, zichtbaar in `/warnings`.
4. De gebruiker ontvangt een DM; lukt die niet, dan een korte kanaalmelding.
5. Staff kan de beoordeling afkeuren; de bijbehorende warn wordt dan ingetrokken.
   Het verwijderde bericht kan niet worden teruggezet.

Gewone medische/educatieve uitleg, borstvoeding, badkleding en niet-seksuele
naaktheid zijn geen automatische overtreding. Bestaande staffuitzonderingen
blijven gelden. De detector doet geen leeftijdsschatting of identificatie.

Ondersteund: tekst en maximaal drie PNG/JPEG/WebP-bijlagen van Discord, elk maximaal
10 MB. Video's, GIF's, externe links/embeds, andere bestanden en extra/grote bijlagen
zijn niet volledig analyseerbaar. Niet-ondersteunde bijlagen geven een handmatige
beoordeling wanneer geen andere duidelijke overtreding is gevonden. Externe links
worden niet bezocht. Afbeeldingen in embeds worden niet gescand.

Bij twijfel of een onbruikbaar modelantwoord wordt niet automatisch verwijderd
of gewaarschuwd. Bij Groq-fouten/rate limits wordt de fout gemeld; er kan inhoud
ongecontroleerd blijven staan. Ook een ontbrekend stafflog blokkeert automatische
maatregelen. Het is detectie met foutkansen, geen gegarandeerd filter en niet
letterlijk onmiddellijk: er zijn wachtrij- en API-tijden.

Officiële modeldocumentatie: https://console.groq.com/docs/vision
