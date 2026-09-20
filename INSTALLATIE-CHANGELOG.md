# Automatische changelogmelding

Bij een gewijzigde geïnstalleerde versie stuurt de bot per server een embed en
CHANGELOG.md naar het ingestelde Logging.Channel. Zet Logging.Enabled aan en geef
de bot toegang plus rechten voor berichten, embeds en bijlagen.

```text
/config instellen instelling:Logging.Enabled waarde:ja
/config instellen instelling:Logging.Channel waarde:JOUW_LOGKANAAL_ID
```

De controle start bij opstarten en herhaalt iedere vijf minuten. De laatst
succesvol verstuurde versie staat per server in de database. Bewaar die database
bij updates. Een gewone herstart stuurt dezelfde versie niet opnieuw; een downgrade
is wel een versiewijziging. Bij ontbrekende release notes of een mislukte verzending
probeert de bot later opnieuw. Houd één botproces actief.

Sinds 2.4.7 komt de versie uit package.json. Verhoog bij een release ook de
projectversie in package-lock.json en voeg een passend `## 2.4.8 — datum`-hoofdstuk
toe aan CHANGELOG.md. Alleen de changelogtekst wijzigen triggert geen nieuwe melding.

De GitHub-versiechecker meldt beschikbare updates in de console. Deze
changelogfunctie meldt de versie die je daadwerkelijk hebt geïnstalleerd in Discord.
Zie GITHUB-INSTALLATIE.md voor bijwerken en publiceren.
