# MVO-bewijs werkbank

Interne webapplicatie voor het beheren van MVO-bewijsprocessen voor Nederlandse MKB-klanten.

## Overzicht

De MVO-bewijs werkbank ondersteunt het volledige proces van ESG/MVO-dienstverlening:
- **Klantdossiers**: Beheer klantgegevens, processtatus en bewijsstukken
- **Scan & gatanalyse**: Inventariseer marktvraag en operationeel bewijs, genereer gap-analyse
- **Wetgeving & drempels**: Doorzoekbare database van relevante EU/NL regelgeving met drempelcheck
- **Claimcheck**: Controleer groene claims op greenwashing-risico's

## Technische stack

- **Framework**: Next.js 16 (App Router)
- **Taal**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (lokaal) / Vercel Postgres (productie)
- **Authenticatie**: Simpele wachtwoordbeveiliging via middleware

## Lokale installatie

### Vereisten
- Node.js 18 of hoger
- npm of yarn

### Stappen

1. **Clone de repository**
   ```bash
   git clone <repository-url>
   cd mfimpact
   ```

2. **Installeer dependencies**
   ```bash
   npm install
   ```

3. **Configureer environment variabelen**
   
   Maak een `.env.local` bestand in de root:
   ```env
   APP_PASSWORD=jouwwachtwoord
   ```
   
   Als je geen wachtwoord instelt, is de standaard: `mvo2024`

4. **Start de development server**
   ```bash
   npm run dev
   ```

5. **Open de applicatie**
   
   Navigeer naar [http://localhost:3000](http://localhost:3000)
   
   Log in met het wachtwoord uit stap 3 (of `mvo2024` als standaard)

## Database

### Lokale ontwikkeling
De applicatie gebruikt SQLite voor lokale ontwikkeling. De database wordt automatisch aangemaakt in de `data/` directory bij de eerste start. Voorbeelddata (demo klant en wetgeving) wordt automatisch ingevoegd.

### Productie (Vercel)
Voor deployment op Vercel kun je verschillende database-opties gebruiken:

#### Optie 1: Vercel Postgres (aanbevolen)
1. Maak een Vercel Postgres database aan in je project
2. De environment variabelen worden automatisch toegevoegd
3. Update `lib/db.ts` om Vercel Postgres te gebruiken in productie

#### Optie 2: Upstash Redis of andere providers
Je kunt ook andere databases gebruiken die compatibel zijn met Vercel's serverless omgeving.

**Let op**: Voor productie moet je de database-logica aanpassen om met een serverless-vriendelijke database te werken. De huidige SQLite implementatie is vooral bedoeld voor lokale ontwikkeling.

## Deployment op Vercel

### Via Vercel CLI

1. **Installeer Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login bij Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Configureer environment variabelen**
   
   In het Vercel dashboard:
   - Ga naar Settings → Environment Variables
   - Voeg toe:
     - `APP_PASSWORD`: jouw wachtwoord

### Via GitHub integratie

1. Push de code naar GitHub
2. Importeer het project in Vercel via [vercel.com/import](https://vercel.com/import)
3. Configureer environment variabelen zoals hierboven
4. Deploy!

## Gebruik

### Modules

#### 1. Klantdossiers
- **Overzicht**: Lijst van alle klanten met basis informatie
- **Detail**: Volledig dossier met:
  - Bedrijfsgegevens (KvK, sector, grootte)
  - Processtatus per stap
  - Bewijsstukken
  - Geïdentificeerde gaps
- **Acties**: Klant toevoegen, bewerken, bewijsstukken koppelen

#### 2. Scan & gatanalyse
- **Marktvraag**: Inventariseer wat afnemers, banken en tenders vragen
- **Operationeel bewijs**: Check welke systemen/data de klant al heeft
- **Gatanalyse**: Automatische generatie van gaps met prioriteit en suggesties
- **Export**: (toekomstige uitbreiding voor CSV/XLSX)

#### 3. Wetgeving & drempels
- **Database**: 16 vooraf ingeladen EU/NL/internationale regelgeving items
- **Filters**: Zoek op type (hard/soft law), niveau (EU/NL/internationaal), trefwoorden
- **Drempelcheck**: Vergelijk klantgegevens met drempels voor directe en indirecte toepasselijkheid
- **Let op**: Items gemarkeerd als "Te verifiëren" moeten worden gecontroleerd tegen officiële bronnen

#### 4. Claimcheck
- **Input**: Plak marketingtekst of claims
- **Analyse**: Automatische detectie van greenwashing-risico's
- **Resultaat**: 
  - Rood/oranje/groen stoplicht
  - Lijst van risico's met ernst (hoog/middel/laag)
  - Concrete verbeterstips
- **Koppeling**: Optioneel koppelen aan klantdossier voor historiek

## Belangrijke opmerkingen

### Disclaimer
Dit systeem is **geen officiële certificeringsinstantie of keurmerk**. Het ondersteunt het MVO-bewijsproces maar vervangt geen:
- Officiële audits
- Juridische toetsing
- Externe certificeringen

Deze disclaimer staat in de footer van elke pagina.

### Databeveiliging
- Gebruik sterke wachtwoorden in productie
- Behandel klantgegevens vertrouwelijk
- Overweeg HTTPS-only in productie (Vercel doet dit standaard)

### Onderhoud wetgeving
De wetgevingsdatabase moet regelmatig worden bijgewerkt:
- Controleer peildatums
- Update thresholds bij nieuwe regelgeving
- Verifieer items gemarkeerd als "Te verifiëren"

## Structuur

```
mfimpact/
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/           # Authenticatie endpoints
│   │   ├── klanten/        # Klant CRUD
│   │   ├── scan/           # Scan & gap analyse
│   │   ├── wetgeving/      # Wetgeving & drempelcheck
│   │   └── claimcheck/     # Claimcheck
│   ├── components/         # Herbruikbare componenten
│   ├── dashboard/          # Dashboard pagina
│   ├── klanten/           # Klanten module
│   ├── scan/              # Scan module
│   ├── wetgeving/         # Wetgeving module
│   ├── claimcheck/        # Claimcheck module
│   ├── login/             # Login pagina
│   └── globals.css        # Globale styles
├── lib/
│   ├── db.ts              # Database setup & types
│   ├── seed.ts            # Seed data (demo + wetgeving)
│   └── claimcheck-rules.ts # Claimcheck regels
├── middleware.ts          # Auth middleware
└── README.md             # Deze file
```

## Licentie

Intern gebruik - Alle rechten voorbehouden

## Contact

Voor vragen en ondersteuning: [je-email@voorbeeld.nl]

---

**Gebouwd met ❤️ voor Nederlandse MKB MVO-dienstverleners**
