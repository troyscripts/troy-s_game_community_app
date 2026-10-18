# Troy’s Game Community Bot — 3.0.3

## Nieuw in 3.0.3: bedrijven, heists en bank

Gebruik `/bedrijf`, `/heist`, `/bank` en `/makelaar actie:verkopen`. Zie `UPDATE-3.0.3.txt` voor installatie, prijzen en alle spelregels.

## Nieuw in 3.0.2: wonen en boodschappen

- `/makelaar`: starterwoning, luxe woning en luxe villa kopen of huren.
- Bronzen, zilveren en gouden woningrollen; +50%, +100% en +200% XP/inkomen boven op VIP.
- Bij verhuizen 15% terug voor je vorige koopwoning; de oude woningrol vervalt.
- Huur elke 24 uur via bank, ook na downtime en bij onvoldoende saldo; opzeggen via `/makelaar`.
- `/supermarkt`: eten en drinken kopen, voorraad bekijken en producten gebruiken.
- Woningen, contracten en voorraad blijven behouden bij alle bestaande resets.
- Zie `UPDATE-3.0.2.txt`, `HANDLEIDING.md` en `MANUAL-EN.md` voor de voorwaarden en commando’s.

## Nieuw in 3.0.1: verplichte rekeningen en economy-reset

**Kopen:** open `/store`, kies **Verplichte rekening · €5.000** en bevestig. Elke aankoop geeft één gebruik; je hoeft nog geen ontvanger te kiezen. Dit werkt ook zonder ingestelde VIP-rol. Betaling kan uit portemonnee of bank, met voldoende saldo.

**Versturen:** `/rekening sturen gebruiker:@lid bedrag:7000 omschrijving:Voorbeeld verplicht:Ja`. De aankoop wordt pas verbruikt zodra de rekening succesvol is opgeslagen. Bedrag: €1 t/m €7.000 spelgeld. Niet naar jezelf, bots of iemand buiten de server. De bestaande rekeningcooldown en limiet van 20 openstaande rekeningen blijven gelden.

**Rente en betaling:** vanaf het versturen stijgt het bedrag elke volle 24 uur met 10% over het actuele bedrag, telkens afgerond op hele spel-euro’s. Bij €7.000 is dat na 7 dagen €13.641. Eerder betalen via `/rekening betalen` stopt de rente; daarbij is voldoende saldo nodig. Weigeren en annuleren zijn bij verplichte rekeningen niet mogelijk. Na zeven dagen schrijft de bot automatisch het bedrag inclusief zeven rentestappen af van de bank van de ontvanger en bij op de bank van de afzender. De ontvanger mag hierdoor in de min komen. Controle iedere 30 seconden en bij opstarten; na uitval wordt de betaling ingehaald, zonder extra rente na dag 7. Bestaande verplichtingen worden ook verwerkt wanneer nieuwe economy-acties uitstaan.

**Bekijken:** `/rekening overzicht` en `/rekening bekijken` tonen de actuele schuld. `/store actie:status` toont ongebruikte aankopen; `/store actie:geschiedenis` toont VIP en rekening-aankopen.

**Reset iedereen:** `/reset-economy bevestigen:Ja`, met dezelfde owner-toegang als `/config`, werkt alleen voor de huidige server. Portemonnees en positieve banksaldi gaan naar €0; daily-, work-, steel- en rekeningcooldowns worden gewist. Gewone openstaande rekeningen worden geannuleerd. XP/levels blijven staan. Lopende VIP-leveringen moeten eerst afgerond zijn.

**Behouden bij serverbrede reset:** VIP, aankoopgeschiedenis, ongebruikte verplichte rekeningen, verstuurde verplichte rekeningen inclusief rente en oorspronkelijke betaaldatum, en bestaande negatieve banksaldi. Dit geldt ook voor `/reset-voortgang`. Een persoonlijke `/economy-reset gebruiker:@lid` zet wél zowel de portemonnee als de bank op €0, inclusief bestaande bankschuld. Aankopen en nog openstaande verplichte rekeningen blijven daarbij intact en kunnen later opnieuw tot een afschrijving leiden. Nieuwe stortingen lossen bankschuld af. Een verstuurde rekening levert bij een reset geen nieuw ongebruikt aankooprecht op.

## 3.0.0 — servertaal en logtaal

- `/config instellen instelling:Bot.Language waarde:nl` kiest Nederlands; `en` kiest Engels en `both` beide talen (standaard).
- `Logging.Language` kiest los de Discord-logtaal: standaard `nl`, optioneel `en` of `both`.
- Gebruikers en rollen worden eenmaal per bericht vermeld; herhalingen tonen gewone namen.
- Persoonlijke `/language`-keuzes blijven gelden. Zonder keuze volgt een Engelse server Engels, anders Nederlands.
- Instellingen werken direct per server. Bestaande /config-bevoegdheden blijven gelden.

## 2.9.9-beta — tweetalige bot

Openbare berichten verschijnen in het Nederlands en Engels. Met `/language` kiest ieder lid de taal voor privéantwoorden. `/help` volgt die voorkeur. Discord toont Engelse commandnamen en beschrijvingen bij een Engelse interface.

Pollvragen en antwoorden worden vertaald en opgeslagen. `vraag-en` en `antwoorden-en` bieden handmatige invoer of correctie. Gebruik `/welkomstbericht vertalen` voor de ingestelde welkomsttekst; met `engels` kun je zelf een vertaling invullen. Na een wijziging van de Nederlandse welkomsttekst opnieuw vertalen. `/say vertalen:True` plaatst je bericht met Engels eronder; met `engels` kun je de vertaling zelf invullen.

Automatische vertaling gebruikt de bestaande `GROQ_API_KEY` in `.env`. Geen nieuwe afhankelijkheden. Er wordt nooit vertaald bij iedere stem of ieder nieuw lid. Zie HANDLEIDING.md en MANUAL-EN.md voor de werking en foutafhandeling.

Controleer lokaal met `npm run check` en `npm run test:languages`. De taaltest gebruikt tijdelijke SQLite-opslag en nagebootste Discord-/Groq-aanroepen.


Complete Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen, counting, agenda, AI-chat en instelbare welkomstberichten.

## Handleiding

**Voor het eerst gedownload? Begin bij [INSTALLATIE.md](INSTALLATIE.md).** Daarin staan Discord-app aanmaken, hosting, `.env`, opstarten en optionele GroqCloud-AI stap voor stap.

[HANDLEIDING.md](HANDLEIDING.md) bevat de slashcommando’s, instellingen en voorbeelden voor leden en beheerders. [CHANGELOG.md](CHANGELOG.md) beschrijft de wijzigingen.

## Nieuw in 2.9.9-beta — VIP-winkel

Stel `/config instellen instelling:Store.VIPRole waarde:@VIP` in met een aparte VIP-rol, onder de hoogste botrol. De bot heeft Rollen beheren nodig.

`/store` verkoopt 1 dag VIP voor €500, 3 dagen voor €1.300 en 7 dagen voor €2.700 spelgeld. Kies optioneel `betaalmiddel:Bank`. Elke aankoop vraagt bevestiging; verlengingen sluiten aan op je huidige eindtijd. Bekijk `/store actie:status` en `/store actie:geschiedenis`.

VIP geeft de bestaande 2× beloningsbonus wanneer bonusbeloningen aanstaan. De rol verloopt automatisch; controle iedere 30 seconden en bij herstart. De winkel houdt betalingen en eindtijden bij in de database. Gebruik een aparte rol die niet ook als staff-, verjaardags- of automatische ledenrol dient.

Update vanaf 2.6.1 inclusief de Engelse /help-aanvulling: stop de bot, maak een databaseback-up, plaats de bestanden en herstart. De nieuwe tabellen en het commando worden automatisch aangemaakt. Geen nieuwe dependencies.

## Handleidingen in Nederlands en Engels

Gebruik `/help taal:Nederlands` of `/help taal:English` om de gewenste handleiding in het huidige kanaal te ontvangen. Zonder taalkeuze blijft Nederlands de standaard. In een Engelstalige Discord-interface heet de optie `language`. De Engelse handleiding staat in [MANUAL-EN.md](MANUAL-EN.md).

Herstart de bot na deze aanvulling; de taaloptie wordt automatisch geregistreerd. De taalkeuze is sinds de aanvulling op 2.6.1 beschikbaar.

## Nieuw in 2.6.1 — Giveaways

Start als staff een giveaway met `/giveaway start`: titel, tekst, einddatum (`DD-MM-JJJJ UU:MM`, Nederlandse tijd) en prijzen gescheiden door `|`. Elke prijs krijgt één unieke winnaar. Gebruik dezelfde prijs meerdere keren voor meerdere exemplaren.

Leden doen mee via de knop. `/giveaway stoppen` trekt direct winnaars; `/giveaway annuleren` verwijdert een open giveaway zonder trekking. Geef bij beheer het Giveaway-ID onder het bericht op. De einddatum mag maximaal twee kalendermaanden vooruit liggen. Zie [HANDLEIDING.md](HANDLEIDING.md) voor details.

Update vanaf 2.6.0: stop de bot, maak een back-up, plaats de gewijzigde bestanden en herstart. Geen nieuwe dependencies nodig; tabel en slashcommando’s worden automatisch aangemaakt.

## Nieuw in 2.6.0 — Bump-herinneringen

Stel een kanaal in met `/config instellen instelling:Bump.Channel waarde:#bump`. De bot stuurt daar iedere twee uur een herinnering om `/bump` te gebruiken. De eerste herinnering volgt direct bij activeren. Uitschakelen kan met dezelfde instelling en waarde `uit`. De planning wordt per server opgeslagen en blijft na een herstart bewaard.

Update vanaf 2.5.9: stop de bot, plaats de gewijzigde bestanden en herstart. Nieuwe dependencies zijn niet nodig. Je serverinstellingen blijven behouden.

## Nieuw in 2.5.9 — Uitgebreide polls

Maak polls met `/poll maken`, 2–10 antwoorden gescheiden door `|`, een looptijd in minuten en optioneel meerdere keuzes per persoon. Staff beheert polls via `/poll wijzigen`, `/poll stoppen` en `/poll annuleren`, met het Poll-ID onder het bericht.

Vraag of antwoorden wijzigen wist bestaande stemmen; alleen de timer wijzigen behoudt ze. Polls en stemmen blijven na een herstart bewaard. Zie [HANDLEIDING.md](HANDLEIDING.md) voor voorbeelden en rechten.

Update vanaf 2.5.8: stop de bot, maak een databaseback-up, plaats de gewijzigde bestanden en herstart. Geen nieuwe dependencies nodig. De polltabel en slashcommando’s worden automatisch bijgewerkt. Oude polls met emoji-reacties worden niet omgezet.

## Nieuw in 2.5.8 — Handleiding via Discord

Gebruik `/help` om `HANDLEIDING.md` als bijlage in het huidige kanaal te ontvangen, samen met de supportlink. Het antwoord is openbaar. De bot moet berichten kunnen verzenden en bestanden kunnen bijvoegen.

Na het plaatsen van update 2.5.8: herstart de bot. Het nieuwe commando wordt bij het opstarten automatisch geregistreerd.

## Nieuw in 2.5.7

Vroege interactiebevestiging voor acht economy-commando’s en verbeterde centrale foutafhandeling. Wachttijd- en foutmeldingen blijven privé. Bij een mislukte eerste bevestiging worden geen economy-wijzigingen uitgevoerd.

## Nieuw in 2.5.6

AI-chat werkt nu via GroqCloud, zonder eigen AI-host. Zie [GROQ-INSTALLATIE.md](GROQ-INSTALLATIE.md) voor installatie en testen.

## Nieuw in 2.5.5

De vaste boteigenaar heeft in elke server toegang tot botbeheer, onafhankelijk van rollen en de ownerlijst. De botstatus is vastgezet op **Troy Scrips** en kan niet via Discord of .env worden aangepast. Wie de broncode beheert, kan die code uiteraard wijzigen. Discord-kanaalrechten, commandoverschrijvingen en de rechten/rolhiërarchie van de bot blijven gelden.

## Nieuw in 2.5.4

Twitch-livemeldingen via `/notify`, met kanaalkeuze en pingrollen voor iedere streamer. Zie [TWITCH-HANDLEIDING.md](TWITCH-HANDLEIDING.md) voor appgegevens en het instellen van troyenrobin.

## Nieuw in 2.5.3

Robuustere YouTube- en GitHub-controles met veilige doorverwijzingen, een extra poging bij tijdelijke netwerkfouten en concrete foutcodes. Dezelfde YouTube-creator wordt per controleronde eenmaal opgehaald. Notify meldt herstel na fouten. De correcties voor de YouTube-cookiepagina, kanaal-ID’s zonder UC-prefix en de loggerfout in de versiechecker zijn inbegrepen.

## Nieuw in 2.5.2

Automatische YouTube- en TikTok-videomeldingen met `/notify`: vier instelbare pingrollen, een kanaal per creatoraccount, meerdere creators per server en beheer door Head Admin, Owner en Developer. TikTok vereist eenmalig accounttoestemming. Zie [NOTIFY-HANDLEIDING.md](NOTIFY-HANDLEIDING.md).

## Nieuwe installatie

1. Volg [INSTALLATIE.md](INSTALLATIE.md) en gebruik Node.js 24 LTS.
2. Kopieer `.env.example` naar `.env` en vul je eigen Discord-botgegevens in.
3. Installeer de dependencies met `npm ci`.
4. Vul voor een eerste installatie ook `GUILD_ID` in `.env` in en registreer de slashcommando’s met `npm run deploy`. De bot moet al aan die server zijn toegevoegd.
5. Start de bot met `npm start`.
6. Stel de server in via `/config`. De servereigenaar en ingestelde owners/developers hebben toegang.

Voor welkomstberichten stel je `Welcome.Enabled` in op `ja` en `Welcome.Channel` op het gewenste kanaal. Gebruik daarna `/welkomstbericht instellen`. De bot heeft toegang tot dat kanaal nodig, inclusief Berichten verzenden en Links insluiten. Schakel de benodigde Discord-intents in overeenkomstig je botinstellingen; zie ook de opstartcontrole van de bot.

## Bestaande installatie bijwerken

Stop de bot, maak een back-up en kopieer de bestanden uit het updatepakket naar dezelfde paden in de botmap. Start daarna opnieuw. Voor 2.5.7 zijn geen nieuwe dependencies of slashcommandregistraties nodig; neem de nieuwe helper `utils/deferredReply.js` mee. Voor de Groq-update naar 2.5.6 zijn geen nieuwe dependencies of slashcommandregistraties nodig. Voeg voor AI je eigen GROQ_API_KEY en GROQ_MODEL toe aan je bestaande .env; zie [GROQ-INSTALLATIE.md](GROQ-INSTALLATIE.md). De automatische changelog gebruikt de bestaande logginginstellingen.

## Instellingen en gegevens

Iedere server gebruikt zijn opgeslagen databaseconfiguratie. Je eerder via Discord ingestelde waarden worden dus weer actief. Controleer ze met `/config bekijken` en pas ze aan met `/config instellen`. Waarden die je alleen in defaults wijzigde, worden niet over een bestaande databaseconfiguratie heen gekopieerd.

`config/defaults.js` blijft nodig voor basiswaarden en globale instellingen, zoals owners, databasepad en botstatus. Verwijder dit bestand niet. Serverinstellingen worden via Discord opgeslagen; de oude bestandsmodus bestaat niet meer.

XP en economy worden pas gewist wanneer je het resetcommand met bevestiging uitvoert. De update zelf reset geen voortgang.

## Updates en GitHub

De versiechecker gebruikt `package.json` en de repository in `config/updates.js`:
https://github.com/troyscripts/troy-s_game_community_app

De bot controleert bij opstarten en iedere zes uur op een nieuwere stabiele Latest-release. Updates worden niet automatisch geïnstalleerd. De automatische Discord-changelog gebruikt `Logging.Enabled` en `Logging.Channel` en verstuurt iedere versie eenmaal nadat afleveren is gelukt.

Publicatie-instructies staan in [GITHUB-INSTALLATIE.md](GITHUB-INSTALLATIE.md).

## Controles

- `npm run check`: controle van syntax, commandnamen en vereiste bestanden.
- `npm run test:updates`: tests voor de versiechecker.
- `npm run prepare:github`: maak een openbare export zonder lokale botdata.

Deze broncode is lokaal gecontroleerd. Er is geen live Discord-test uitgevoerd.
