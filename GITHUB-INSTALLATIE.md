# GitHub-pakket 2.5.0 publiceren

Dit pakket bevat alleen 14 gewijzigde of nieuwe bestanden ten opzichte van de aangeleverde troy-s_game_community_app-main(2).zip (2.4.9/2.4.9A). Inclusief beide herstelupdates voor de welkomstfunctie, versie 2.5.0 en de gebruikershandleiding. Het is geen volledige installatie. Behoud alle overige repositorybestanden.

1. Pak de ZIP uit en upload de inhoud naar de hoofdmap van `troyscripts/troy-s_game_community_app`.
2. Vervang de meegeleverde bestanden op hetzelfde pad en voeg de nieuwe bestanden toe. Laat index.js, .env.example, .gitignore en overige ongewijzigde bestanden staan.
3. Commit de bestanden.
4. Publiceer een gewone release met tag `v2.5.0`, stel deze in als Latest en gebruik het hoofdstuk 2.5.0 uit `CHANGELOG.md` als releasebeschrijving. Als de tag/release al bestaat, werk die bestaande release bij; maak geen tweede identieke tag.
5. Voeg deze update-ZIP als releasebestand toe als je een directe download wilt aanbieden.

Alleen bestanden uploaden publiceert geen release. De versiechecker zoekt naar de Latest-release. Bots die al 2.5.0 draaien melden geen nieuwere versie voor herstelcode met hetzelfde versienummer; gebruikers moeten die herstelbestanden handmatig installeren.

## Openbare inhoud

`config/settingsSource.js` heeft een lege `DefaultsGuildId`. De andere openbare configuratiebestanden hebben geen persoonlijke kanaal-, rol- of gebruikers-ID’s. `.env.example` bevat uitsluitend lege velden en veilige standaardwaarden.

De export bevat geen `.env`, databasebestanden, logs, back-ups, tickettranscripts, node_modules of Git-geschiedenis. JavaScript-bronbestanden uit de map `database` horen wel bij de bot en worden meegeleverd.

## Een volgende export maken

Gebruik `npm run prepare:github` vanuit een opgeschoonde kopie. Het script controleert de toegestane bronbestanden en maakt een nieuwe `github-export-...`-map. Upload alleen de inhoud van die map. De gebruikershandleiding gaat mee in de export.

Bewaar eigen botgegevens buiten de openbare kopie. Bij installatie over een bestaande bot behoud je de eigen configuratie, `.env` en database zoals beschreven in `README.md`.
