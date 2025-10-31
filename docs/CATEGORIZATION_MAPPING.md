# Offer Categorization Mapping

This document shows how existing offers are categorized based on their names, using **ONLY existing categories**.

## Available Categories

1. **Essen & Trinken** (`20c10efe-404b-4a39-bb81-5089a0332d78`) - Food & Drink
2. **Bildung & Lernen** (`21e8a577-f42c-499d-a277-0b8ba327c00b`) - Education
3. **Kleidung & Mode** (`49563bf0-6962-4fd8-9147-5e68e9310eb1`) - Clothing & Fashion
4. **Gesundheit & Sport** (`df8e549d-54c4-48ef-8e0b-c5a6646fcb7d`) - Health & Sports
5. **Handwerk & Reparatur** (`b43ba9ba-965e-46f8-a97e-c76d352c2ff0`) - Crafts & Repair
6. **Dienstleistungen** (`1288f269-2cdb-47e8-bd8e-9d552ff25e83`) - Services
7. **Gemeinschaft & Spenden** (`4470c3e0-458f-40a6-a96e-ca0fbdf145d7`) - Community Support
8. **Sonstiges** (`5e5d910d-d790-4184-a061-9cd74d0950e8`) - Other (Default)

## Category Mappings

### 🍔 Essen & Trinken (Food & Drink)
- Kuchen, Kaffee, Kaffe
- Gegrilltes, Döner, Burger
- Pide/Pizza, Pommes, Essen
- Frühstück, Brunch, Mittagessen
- Mittagstisch, Abendessen
- Catering, Buffet
- Metzgerei (Halal)
- Obst/Gemüse, Gebäck

### 🏥 Gesundheit & Sport (Health & Sports)
- Massage
- Ernährungsberatung
- Hijama (Schröpfen)
- Heilpraktiker, Chiropraktiker
- Physiotherapie, Therapie
- Behandlung
- Alternative Medizin
- Wellness, Fitness
- Vorsorge, Diagnostik

### 📚 Bildung & Lernen (Education)
- Quran-Unterricht
- 5 Gebete
- Möglichkeit zum Beten
- Dhikr
- *(Note: Already categorized: Islamunterricht, Vorträge, Nachhilfe, Webinare, Seminare, Workshops, Kurse, Arabischkurse, Training, Coaching, Mentoring)*

### 👕 Kleidung & Mode (Clothing & Fashion)
- Modestrecken
- Maßanfertigung
- Änderungsservice
- Personal Styling
- Kleidungsverkauf

### 🔨 Handwerk & Reparatur (Crafts & Repair)
- Renovierung
- Wartung
- Installation
- Reparatur
- Rolläden
- Austausch Fenster und Türen

### 🛠️ Dienstleistungen (Services)
Includes: General Services, Technology, Transport, Real Estate
- **General**: Dienstleistungen, Support, Verkauf, Sales, Events, Notdienst, Finanzierung
- **Technology**: Datenanalyse, Cybersecurity, IT-Support, Cloud-Lösungen, Softwareentwicklung, App-Entwicklung, Webentwicklung, Hosting, Logo-Design
- **Transport**: Transport, Lieferung, Lieferservice, Expressversand, Kurierdienst, Möbeltransport, Internationale Transporte, Umzüge, Lagerhaltung
- **Real Estate**: Immobilienbewertung, Immobilien Verkauf, Immobilien Vermietung, Immobilien, Vermietung, Maklerservice, Hausverwaltung

### 💚 Gemeinschaft & Spenden (Community Support)
- Palestine
- Postkarten
- Islamische Postkarten
- Wohltätigkeitsprojekte
- Spendensammlung
- Infrastrukturprojekte
- Bildungsprojekte
- Humanitäre Hilfe
- Gesundheitsprojekte

### ❓ Sonstiges (Other) - Default
- Any offers that don't match the above patterns
- Miscellaneous items

## How to Apply

1. **First**, ensure migration `005_add_category_to_offers_needs.sql` has been run (adds the column)

2. **Then**, run migration `007_categorize_existing_offers.sql` to categorize all NULL offers

3. **Finally**, run migration `006_fill_missing_categories.sql` to:
   - Fill any remaining NULL values with "Sonstiges" category
   - Set NOT NULL constraint

## Notes

- **No new categories are created** - uses only existing 8 categories
- Uses hardcoded category_ids for reliability
- "Dienstleistungen" serves as catch-all for services, tech, transport, and real estate
- "Sonstiges" is the default fallback category
- All offers will have a category_id after running these migrations
