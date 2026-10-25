# Versie 3.1.9 publiceren

## Bestanden klaarzetten

1. Gebruik het volledige 3.1.9-pakket. Kopieer de inhoud van `troy-s_game_community_app/` naar de hoofdmap van je repository; maak geen extra tussenmap.
2. Heb je de losse documentatiecorrectie ontvangen? Pak die uit over dezelfde hoofdmap en vervang de genoemde Markdown-bestanden. De codeversie blijft 3.1.9.
3. Neem `.github/workflows/check.yml`, `package.json`, `package-lock.json`, de actuele handleidingen en `CHANGELOG.md` mee.
4. Upload geen `.env`, databases, `node_modules`, logs, back-ups, transcripts of `data/notify-tokens.json`. Vanuit een gebruikte installatie kun je `npm run prepare:github` gebruiken; controleer de export voordat je publiceert.
5. Deze correctie vereist geen bestandsverwijderingen.

## Controleren en publiceren

Voer in een schone testkopie `npm ci --no-audit --no-fund` en `npm run ci` uit. Commit en push daarna de wijzigingen. Controleer in GitHub Actions dat **Botcontroles / Node.js 22** én **Node.js 24** slagen. Verwijder een mislukte controle niet om een installatieprobleem te verbergen.

Publiceer release `v3.1.9` pas wanneer de code en documentatie compleet zijn. Gebruik het hoofdstuk 3.1.9 uit `CHANGELOG.md` als releasebeschrijving. Voeg desgewenst het volledige pakket toe. Publiceren gebeurt niet automatisch door deze ZIP te downloaden.

De versiechecker gebruikt `package.json`; `config/defaults.js` haalt daar de globale botversie uit. De repository staat in `config/updates.js`; wijzig die alleen als je bewust een andere repository gebruikt.

## Hosting bijwerken

Stop de bot, bewaar `.env`, database en eigen `data/`-bestanden, upload het pakket en voer `npm ci --no-audit --no-fund` uit. Bij hosting die dit automatisch uitvoert, controleer je de installatielog na de herstart. Vanaf 3.1.8 zijn geen nieuwe slashcommands of configvelden toegevoegd. Zie [INSTALLATIE.md](INSTALLATIE.md) en [UPDATE-3.1.9.md](UPDATE-3.1.9.md).
