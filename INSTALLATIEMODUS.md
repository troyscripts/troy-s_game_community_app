# Botnaam en installatiemodus — 3.6.0

## Beginnen

1. Installeer de update en herstart de bot. Commands worden via de bestaande registratie bijgewerkt; zo nodig `npm run deploy` uitvoeren.
2. De echte Discord-servereigenaar kan beginnen zonder vooraf ingestelde rollen. Stel `Roles.Owner` en `Roles.Developer` in met `/config instellen` of in de installatie. Alleen deze rollen en de servereigenaar mogen de nieuwe installatie bedienen; Administrator of een globale botowner-ID alleen geeft geen toegang.
3. Voer `/gebruikersnaam naam:Mijn Bot` uit. De bot heeft het Discord-recht **Bijnamen wijzigen** nodig. Bij een geweigerde naamswijziging worden naam en footer niet opgeslagen.
4. De serverbijnaam, `Bot.Name` en `Bot.Footer` worden aangepast. Nieuwe embeds en de AI-chat gebruiken deze configuratie. Je mag de footer daarna zelf anders instellen.

De naam is servergebonden: Discords globale accountnaam, applicatienaam en gedeelde status blijven globaal. Oude berichten, bestaande gepubliceerde panelen en bestaande transcripten worden niet herschreven; publiceer/ververs panelen via hun bestaande commands. Zelfgeschreven teksten worden niet automatisch herschreven. Auteursvermelding, supportadres en projectdocumentatie blijven van Troy Scripts.

## Instellingen doorlopen

- **Wijzigen** opent een formulier. Opslaan gebruikt dezelfde validatie als `/config instellen` en gaat naar de volgende open instelling. Bij ongeldige invoer blijft de stap open.
- **Behouden / klaar** accepteert de huidige waarde zonder deze te wijzigen.
- **Overslaan** laat uitsluitend de huidige instelling open. De overige velden van datzelfde onderdeel blijven beschikbaar, ook als het onderdeel uitgeschakeld staat.
- **Overgeslagen hervatten** maakt de overgeslagen velden opnieuw beschikbaar. Eerder opgeslagen waarden blijven intact.
- Sluiten is veilig. `/gebruikersnaam` zonder naam hervat de opgeslagen voortgang; geen hernoeming nodig.
- `/gebruikersnaam instelling:Tickets.ThreadLogChannel` springt rechtstreeks naar een veld. De lijst heeft autocomplete: typ een deel van de instelling.

Alle via `/config` beheerbare standaardvelden worden automatisch opgenomen, inclusief toekomstige velden. Extra aangepaste levelrollen blijven via `/config` configureerbaar. De voortgang wordt per server in `installation_progress` in de bestaande SQLite-database opgeslagen. Bewaar deze database bij updates en backups. Een nieuw geopend installatiescherm maakt oudere knoppen ongeldig om dubbele of verouderde wijzigingen te voorkomen.

Per veld: booleans `ja`/`nee`, nummers als getal, kanalen/rollen als ID of vermelding, lijsten als JSON of met komma’s. `Birthday.Messages` gebruikt `|`. Een formulier kan maximaal 4000 tekens bevatten; gebruik voor langere invoer het bestaande configuratiecommand. De installatie schakelt functies niet automatisch aan: je bepaalt dit met hun eigen Enabled-velden.

## Aanvullende configuratie

Na de configuratievelden verschijnen afzonderlijke stappen voor profielfoto, welkomstvertaling, creators, selfrolpanelen, ticketpanelen, politie, ambulance, pechhulp, optionele brandweer, overheidscoördinator, radiopaneel en agenda. Gebruik het getoonde bestaande command en kies daarna **Behouden / klaar**, of sla de stap over. Deze stap registreert dat je het onderdeel hebt doorgenomen; zij controleert niet of het externe command succesvol is uitgevoerd.

Tokens, client-ID, API-sleutels, de centrale botkoppeling, databasepad en globale status blijven in de hostingconfiguratie/.env. De laatste stap verwijst naar INSTALLATIE.md en .env.example. Er worden geen geheimen in Discord getoond of ingevoerd.

## Updatecontrole

Gebruik Node.js 24, voer `npm ci` en `npm run ci` uit. Controleer live met een testserver de nieuwe naam, een Owner-rol, een Developer-rol en een gewone gebruiker. Discord-API-verzoeken zijn in de automatische test nagebootst; een live botverbinding is voor lokale tests niet nodig.
