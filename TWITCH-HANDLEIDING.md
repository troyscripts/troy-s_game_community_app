# Twitch-livemeldingen — 2.5.4

## Wat deze update doet

Algemene ondersteuning voor Twitch-streamers via `/notify toevoegen`. Meldingen bevatten een streamtitel, game/categorie, preview en kijklink. Iedere creator heeft per Discordserver een eigen meldingskanaal en optionele pingrol of pingkeuze 1 t/m 4. Alleen Head Admin, Owner en Developer mogen dit beheren.

## Eenmalig Twitch instellen

1. Open https://dev.twitch.tv/console/apps en meld je aan bij Twitch. Je account moet een geverifieerd e-mailadres en tweestapsverificatie hebben.
2. Registreer een applicatie met een unieke naam, bijvoorbeeld `Troys Game Community Notify`. Kies een passende botcategorie en, als dit veld zichtbaar is, het type Confidential.
3. Als het formulier een OAuth Redirect URL vereist, vul `http://localhost` in en voeg deze toe. Deze bot gebruikt de client-credentials-flow en ontvangt geen browsercallback; er hoeft geen website of poort voor geopend te worden.
4. Open Manage bij de applicatie. Kopieer de Client ID en maak met New Secret een Client Secret.
5. Voeg deze regels toe aan de BESTAANDE `.env` op de hosting:

```dotenv
TWITCH_CLIENT_ID=jouw_client_id
TWITCH_CLIENT_SECRET=jouw_client_secret
```

Gebruik Twitch-appgegevens, niet je Discord CLIENT_ID, Discord TOKEN of Twitch-streamkey. Zet het secret alleen op de hosting, niet in GitHub of in Discord. De bot vraagt zelf het app-token aan en vernieuwt het automatisch. Andere publieke Twitch-kanalen hebben geen afzonderlijke creatorlogin nodig voor deze livecontrole.

## Installeren en troyenrobin toevoegen

1. Stop de bot en maak een back-up.
2. Kopieer alleen de bestanden uit het updatepakket over dezelfde paden. Vervang je eigen `.env` niet door `.env.example`.
3. Voeg bovenstaande Twitch-gegevens aan `.env` toe en start de bot opnieuw. De bot registreert de slashcommands bij het starten; wacht tot dat klaar is. Indien nodig kun je de bestaande handmatige registratie `npm run deploy` gebruiken.
4. Voer in Discord uit en selecteer het gewenste kanaal:

```
/notify toevoegen platform:Twitch creator:https://www.twitch.tv/troyenrobin kanaal:#jouw-kanaal
```

Je kunt bijvoorbeeld het bestaande creatorkanaal met ID `1414952604777320473` kiezen. Deze update voegt geen streamer automatisch toe: je kiest zelf de server, het kanaal en de pingrol.

Optioneel: kies `pingkeuze` 1 t/m 4 of een losse `pingrol`. Die vier rollen beheer je met `/notify pingrol`. Eigen bericht ondersteunt `{creator}`, `{platform}`, `{titel}` en `{url}`. Herhaal toevoegen met dezelfde creator om kanaal, bericht en ping te wijzigen.

## Controleren

- `/notify lijst` toont het creator-ID, de laatste geslaagde controle en fouten.
- `/notify test id:NUMMER` plaatst een voorbeeld zonder ping. Dit test Discord, niet je Twitch-appgegevens of live-status.
- Normale controles lopen iedere vijf minuten. Bij fouten probeert de bot later opnieuw met een oplopende wachttijd van vijf tot zestig minuten. Herstarten of de creator opnieuw opslaan wist deze tijdelijke wachttijd.
- Een stream die bij de eerste controle al live is, wordt eenmaal gemeld. Dezelfde stream-ID wordt na herstart niet opnieuw gemeld. Een nieuwe Twitch-stream-ID kan wel opnieuw een melding geven, ook na opnieuw live gaan.
- Een mislukte Discordmelding wordt later opnieuw geprobeerd zolang Twitch de stream nog live bevestigt. Zodra de stream offline is, vervalt de wachtrijmelding. Bij Twitch-fouten worden livemeldingen niet blind verstuurd.
- Zeer korte streams tussen twee controles kunnen gemist worden. Dit is periodieke controle, geen directe EventSub-koppeling. Bestaande Discordmeldingen worden bij offline gaan niet aangepast of verwijderd.
- Deze ondersteuning betreft livestreams; clips en VOD-uploadmeldingen zijn niet inbegrepen.

## Bronnen

- https://dev.twitch.tv/docs/authentication/register-app/
- https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
- https://dev.twitch.tv/docs/api/reference/#get-streams

## Uitgevoerde controle

Automatische tests met gesimuleerde Twitch-antwoorden voor live/offline, tokenhergebruik, HTTP 401, accountvalidatie en dubbele meldingen. Een echte end-to-endtest met jouw Twitch-app en Discordhosting moet na installatie plaatsvinden.
