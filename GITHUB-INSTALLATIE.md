# Update 2.5.1 publiceren

Dit pakket bevat alleen gewijzigde en nieuwe bestanden ten opzichte van de aangeleverde `troy-s_game_community_app-main(4).zip` (2.5.0).

1. Upload de inhoud naar dezelfde paden in de hoofdmap van de repository.
2. Verwijder de bestanden uit `VERWIJDERDE-BESTANDEN.txt` ook op GitHub.
3. Commit de wijzigingen en publiceer release `v2.5.1` als Latest. Gebruik het hoofdstuk 2.5.1 uit `CHANGELOG.md` als releasebeschrijving.
4. Voeg desgewenst deze update-ZIP aan de release toe.

De versiechecker gebruikt de versie uit `package.json`; er is geen afzonderlijke wijziging van `config/updates.js` nodig. De automatische changelogmelding gebruikt de nieuwe versie en `CHANGELOG.md`, wanneer `Logging.Enabled` en `Logging.Channel` goed staan.

Voor installatie op de host: zie `UPDATE-2.5.1.txt`. Upload geen `.env`, database, logs, back-ups of persoonlijke configuratie naar GitHub. Bewaar je lokale `config/defaults.js`; de vaste-configmodus is verwijderd, maar dit bestand blijft nodig als basisconfiguratie.
