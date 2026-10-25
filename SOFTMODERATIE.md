# Softmoderatie — v3.1.9

## Installeren en activeren

1. Stop de bot en maak een back-up van je database en bestanden.
2. Neem de bestanden van het volledige pakket over in de hoofdmap van je bot. Je `.env` en database worden niet meegeleverd of overschreven.
3. Voer bij de update naar 3.1.9 `npm ci --no-audit --no-fund` uit voor het herstelde lockbestand en herstart. Vanaf 3.1.8 zijn geen nieuwe slashcommands toegevoegd. Ontbrekende softmoderatietabellen worden bij opstarten automatisch aangemaakt.
4. Controleer dat `GROQ_API_KEY` in je bestaande `.env` staat. Deze functie werkt onafhankelijk van `AIChat.Enabled` en `AIChat.Channels`.
5. Stel via Discord in (owner/developer):

   `/config instellen instelling:SoftModeration.LogChannel waarde:#jouw-staffkanaal`

   `/config instellen instelling:StaffRoles` — selecteer je staffrollen als deze nog niet ingesteld zijn.

   `/config instellen instelling:SoftModeration.Enabled waarde:ja`

6. Geef de bot toegang tot de te modereren kanalen, berichtinhoud (Message Content Intent), berichten lezen/verzenden, embedlinks en berichtgeschiedenis. Voor threads is ook verzenden in threads nodig. Voor time-outs moet de bot Moderate Members hebben en boven de leden staan. Het staffkanaal moet toegankelijk zijn voor de bot en de bedoelde staff.

De functie staat bij installatie uit omdat het juiste staffkanaal eerst ingesteld moet worden. Alle instellingen zijn per Discord-server. Er bestaat geen kanaaluitsluitingslijst.

## Werking

- Nieuwe en bewerkte tekstberichten worden gecontroleerd, ook in tickets, staffkanalen, forumthreads en overige toegankelijke threads. Privékanalen die de bot niet kan zien kunnen niet worden gecontroleerd.
- `StaffRoles`, de ingestelde rollen Owner/Developer/HeadAdmin/Admin/HeadModerator/Moderator, beheerders, de serverowner en ingestelde globale owners/developers zijn vrijgesteld van deze softmoderatie. De bestaande honeypot behoudt zijn eigen werking.
- Eigen en andere botberichten, webhooks en systeemmeldingen worden overgeslagen om lussen te voorkomen.
- Lokale controles herkennen herhaalde berichten, een berichtenstroom en veel vermeldingen. Groq beoordeelt tekst op duidelijke persoonlijke aanvallen, discriminatie, intimidatie en ernstige bedreigingen. Los vloeken, gamepraat en het bespreken/citeren van incidenten gelden in de instructies niet als overtreding. AI kan zich vergissen; staff houdt de beoordeling.
- De AI krijgt de tekst van het doelbericht en maximaal vier eerdere berichten uit de lokale kanaalcache als context. Dit wordt naar de bestaande Groq-provider gestuurd. Er wordt geen volledig kanaalarchief opgehaald.
- Eerste duidelijke overtreding: een vriendelijke waarschuwing, zonder verwijderen van het bericht.
- Een nieuwe overtreding NA die waarschuwing, binnen standaard 24 uur: een time-out van standaard 24 uur. Een reeds verstuurde berichtenreeks telt als hetzelfde incident. Een niet afgeleverde waarschuwing vormt geen basis voor automatische escalatie.
- Twijfel: alleen een staffmelding, geen waarschuwing of time-out en geen meetellende overtreding. Goedkeuren bevestigt die melding; het legt niet alsnog een straf op.
- Er wordt niet automatisch geband en maatregelen worden niet naar andere servers gekopieerd.

## Staffmelding en knoppen

Elke melding bevat gebruiker, kanaal, berichtinhoud, reden, actie, beoordeling, eindtijd en een directe link naar het oorspronkelijke bericht. De originele link blijft bewaard als het bericht later wordt verwijderd, maar kan dan niet meer worden geopend.

- **Goedkeuren:** bestaande maatregel bevestigen. Daarna kan staff nog afkeuren of een actieve time-out aanpassen.
- **Afkeuren:** overtreding telt niet meer mee; de bijbehorende nog overeenkomende actieve bot-time-out wordt opgeheven. Een andere/later gewijzigde time-out blijft behouden. Eerdere losse incidenten worden niet automatisch afgekeurd.
- **Eindtijd aanpassen:** verschijnt bij een actieve bot-time-out. Opent een tekstveld voor bijvoorbeeld `24-10-2026 20:00`, in `Europe/Amsterdam`. Toekomstig tijdstip, maximaal 28 dagen vanaf nu. Ongeldige datums en dubbele/niet-bestaande tijden rond klokwisselingen worden geweigerd.

Alle knoppen en invulvensters worden gecontroleerd op server, oorspronkelijke staffmelding, staffrechten en rolhiërarchie. Niemand kan zijn eigen incident beoordelen. Verouderde invulvensters kunnen nieuwere beslissingen niet overschrijven. Meldingen en beoordelingen blijven na herstart beschikbaar en worden niet door een economyreset gewist.

## Instellingen via /config

| Instelling | Standaard | Betekenis |
|---|---|---|
| SoftModeration.Enabled | nee | Activering per server |
| SoftModeration.LogChannel | leeg | Staffkanaal met beoordelingsknoppen |
| SoftModeration.TimeoutHours | 24 | Time-outduur, 1–672 uur |
| SoftModeration.RepeatWindowHours | 24 | Herhalingsvenster, 1–720 uur |
| SoftModeration.MinConfidence | 0.9 | Minimale AI-zekerheid voor automatische actie, 0.8–1 |
| SoftModeration.SpamMessages | 6 | Berichten binnen het spamvenster, 3–50 |
| SoftModeration.SpamWindowSeconds | 10 | Spamvenster, 2–120 seconden |
| SoftModeration.MentionLimit | 6 | Aantal gebruikers/rollen in een bericht, 3–50 |
| SoftModeration.QueueLimit | 200 | Maximum wachtende controles, 10–1000 |

Drie identieke berichten binnen het spamvenster en @everyone/@here geven eveneens een spam-/vermeldingssignaal. Staff is hiervan uitgezonderd. Openbare waarschuwingen volgen Bot.Language, staffkaarten volgen Logging.Language; Nederlandse en Engelse labels zijn opgenomen. AI-redenen worden in het Nederlands gevraagd.

## Praktische grenzen

Dit is tekstmoderatie: afbeeldingen, audio, video en de inhoud van bestanden of externe links worden niet geanalyseerd. Er wordt geen oude chatgeschiedenis achteraf bestraft en gemiste berichten tijdens uitval worden niet alsnog gemodereerd. Een al beoordeeld bericht krijgt door bewerken geen tweede incident.

AI-controles zijn afhankelijk van de Groq-verbinding en diens gebruikslimieten. Er zijn twee gelijktijdige controles en een begrensde wachtrij. Bij uitval/volle wachtrij worden sommige berichten niet beoordeeld; er volgt een staffwaarschuwing (maximaal eenmaal per vijf minuten) en een consolemelding. Er volgt geen AI-straf op basis van een mislukte beoordeling. Lokale spamcontrole kan zonder AI werken. Als de staffmelding niet kan worden geplaatst, wordt geen automatische straf uitgevoerd.

## Controle

`npm run check` en `npm run test:softmod` controleren syntax en de moderatielogica met nagebootste Discord/Groq-antwoorden. Live Discord- en Groq-werking moet na activering op de eigen server worden gecontroleerd. Test met een gewone gebruikersrol: staff is bewust vrijgesteld.
