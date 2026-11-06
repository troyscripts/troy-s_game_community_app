# GroqCloud instellen — bot 2.5.6

Installeer je de bot voor het eerst? Volg eerst [INSTALLATIE.md](INSTALLATIE.md). De stappen hieronder zijn voor het toevoegen van Groq aan een bestaande bot.

## 1. Update plaatsen
Stop de bot. Maak een backup. Pak het updatepakket uit en upload de inhoud in de hoofdmap van je bestaande bot, met behoud van de mappenstructuur. Dit pakket bevat uitsluitend nieuwe/gewijzigde bestanden ten opzichte van de aangeleverde 2.5.5. De bestaande database en .env worden niet meegeleverd of vervangen.

## 2. Eigen .env aanvullen
Voeg deze regels aan je bestaande .env toe en vervang alleen de voorbeeldsleutel:

```env
GROQ_API_KEY=VUL_HIER_JE_GROQ_SLEUTEL_IN
GROQ_MODEL=openai/gpt-oss-20b
```

Houd je DISCORD_TOKEN en alle andere instellingen. Upload je echte .env nooit naar GitHub. Een API-sleutel maak je op https://console.groq.com/keys.
Blijf op het gratis Groq-plan als je geen kosten wilt. De bot kan het abonnement van jouw Groq-account niet afdwingen. Gebruik met een betaald account kan kosten veroorzaken.
De oude OLLAMA_BASE_URL, OLLAMA_MODEL en OLLAMA_BRIDGE_TOKEN mogen uit .env. services/ollamaConnection.js wordt niet meer gebruikt en mag worden verwijderd, maar kan ook blijven staan.

## 3. Starten en Discord instellen
Start de bot opnieuw. Nieuwe npm-pakketten en opnieuw registreren van slashcommands zijn niet nodig.
Bestaande AI-instellingen blijven behouden. Controleer in Discord:

/config bekijken onderdeel:AIChat

Indien nodig (vervang 123456789012345678 door je eigen tekstkanaal-ID):

/config instellen instelling:AIChat.Channels waarde:["123456789012345678"]
/config instellen instelling:AIChat.Mode waarde:mention
/config instellen instelling:AIChat.HistoryTurns waarde:2
/config instellen instelling:AIChat.Enabled waarde:ja

De commands gebruiken de bestaande Owner-/Developer-toegang. Met mention reageert de bot alleen wanneer je hem vermeldt. Voor alle berichten kun je Mode op all zetten. HistoryTurns:2 is een zuinige aanbeveling; de update wijzigt bestaande instellingen niet automatisch.

## 4. Testen
Stuur in het ingestelde kanaal: @jouwbot Hallo, kun je jezelf kort voorstellen?
Bij de eerste aanvraag meldt de console: AI-chat: GroqCloud; model openai/gpt-oss-20b.
Controleer het Nederlandse antwoord. Zet daarna Ollama op je pc uit en test nogmaals.
Bij AI_CONFIG/AI_AUTH: controleer de sleutel en modeltoegang; herstart na .env-wijzigingen.
Bij GROQ_HTTP_400/404: controleer modelnaam en beschikbaarheid bij Groq.
Bij AI_RATE_LIMIT: wacht; aanvragen worden tijdelijk voor het hele botproces gepauzeerd. De eerste mislukte aanvraag krijgt een melding, berichten tijdens de pauze worden niet in een wachtrij bewaard.

## Werking en grenzen
Tekstchat zonder internetzoekfunctie, bijlagen of Discord-acties. De bot leest geen oude kanaal- of tickethistorie voor de AI. Alleen de huidige vraag, systeemprompt en beperkte gesprekshistorie met dezelfde gebruiker in hetzelfde kanaal gaan naar Groq. Historie vervalt na 15 minuten en bij herstart. Maximaal 6000 tekens historie, 4000 tekens huidige vraag en 1024 uitvoertokens inclusief redeneerruimte. Interne redeneertekst wordt niet geplaatst.
Groq-limieten gelden ook voor andere bots die dezelfde organisatie gebruiken. Deze update omzeilt geen limieten en schakelt niet automatisch naar een betaald plan.

## Validatie
De update is lokaal gecontroleerd met nagebootste API-antwoorden. Een echte Groq-/Discord-test vereist jouw eigen sleutel op je hosting.

Officiële documentatie:
- https://console.groq.com/docs/openai
- https://console.groq.com/docs/model/openai/gpt-oss-20b
- https://console.groq.com/docs/reasoning
- https://console.groq.com/docs/rate-limits
