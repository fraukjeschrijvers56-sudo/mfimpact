Lever exact dit JSON-object (geen tekst eromheen, geen markdown). Gebruik "onbekend" als waarde wanneer je niets met bron vindt.
Een VELD heeft altijd de vorm: {"waarde": <tekst, getal of lijst>, "status": "gevonden" | "afgeleid" | "onbekend" | "twijfelachtig", "toelichting": <tekst of null>, "bronnen": [{"url": <url>, "citaat": <letterlijk citaat, max 300 tekens>, "datum": <datum of null>}]}

{
  "samenvatting": <3 tot 6 zinnen: wie is dit bedrijf, wat doet het, voor wie, en hoe staat het er op MVO/ESG-gebied voor>,
  "profiel": {
    "juridische_naam": VELD, "handelsnaam": VELD, "kvk_nummer": VELD, "hoofdvestiging": VELD,
    "overige_vestigingen": VELD, "sbi": VELD, "sector": VELD, "producten_diensten": VELD,
    "afnemers_markten": VELD, "belangrijkste_klanten_referenties": VELD, "oprichtingsjaar": VELD,
    "directie_eigenaren": VELD, "moeder_of_groepsmaatschappij": VELD, "contactgegevens": VELD,
    "linkedin": VELD, "omzet": VELD, "aantal_medewerkers": VELD
  },
  "ketenrisico": {
    "eudr": VELD, "cbam": VELD, "levert_aan_grote_ondernemingen_of_overheid": VELD, "bouw_infra_gww": VELD
  },
  "vsme_basic": {
    "B1": {"titel": "Grondslag en opzet rapport", "status": "aanwezig" | "gedeeltelijk" | "ontbrekend", "samenvatting": <tekst>, "bronnen": [...]},
    "B2": {...}, "B3": {...}, "B4": {...}, "B5": {...}, "B6": {...}, "B7": {...}, "B8": {...}, "B9": {...}, "B10": {...}, "B11": {...}
  },
  "extra": {
    "gedragscode_leveranciers": VELD, "duurzaamheidsverslag": VELD, "co2_doelen": VELD, "co2_footprint": VELD, "energie_maatregelen": VELD, "sociaal_beleid": VELD
  },
  "certificaten": [{"platform": <tekst>, "naam": <tekst>, "niveau_of_score": <tekst of null>, "geldig_tot": <tekst of null>, "verificatie": "register" | "zelf_gepubliceerd", "status": "gevonden" | "niet_gevonden_in_register", "bronnen": [{"url": <url>, "citaat": <citaat>, "datum": <datum of null>}]}],
  "nieuws": [{"titel": <tekst>, "datum": <tekst of null>, "samenvatting": <tekst>, "url": <url>}],
  "tenders_projecten": [{"titel": <tekst>, "opdrachtgever": <tekst of null>, "datum": <tekst of null>, "url": <url>}],
  "personen": [{"naam": <tekst>, "functie": <tekst>, "url": <url of null>}],
  "claims": [{"citaat": <letterlijk>, "url": <url>, "type": "generiek" | "klimaatneutraal/compensatie" | "label" | "toekomstclaim" | "vergelijkend" | "specifiek", "beoordeling": "rood" | "oranje" | "groen", "toelichting": <tekst>, "herschrijfvoorstel": <tekst>}],
  "gaten": [{"onderdeel": <tekst>, "prioriteit": "hoog" | "middel" | "laag", "waarom": <tekst>, "bewijsactie": <tekst>}],
  "kansen_gesprek": [<korte gespreksopeners of verkoopkansen voor een MVO-bewijsadviseur, op basis van de gevonden feiten>],
  "twijfelachtig": [{"gegeven": <tekst>, "reden": <tekst>, "bronnen": [...]}],
  "doorzochte_bronnen": [<alle URL's die je bekeek, ook zonder resultaat>]
}
