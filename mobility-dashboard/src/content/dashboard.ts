export const dashboardContent = {
  title: "Unterwegs zur Universität Regensburg",
  heroImage: {
    src: "/bushaltestelle-der-uni.jpg",
    alt: "Bushaltestelle auf dem Campus der Universität Regensburg",
    message:
      "Dieses Dashboard macht sichtbar, wie Angehörige der Universität Regensburg zur Universität pendeln und wo sich Ansatzpunkte für Veränderung zeigen.",
  },
  sectionNavigation: [
    {
      label: "Überblick",
      question:
        "Welche zentralen Ergebnisse zeigt das Dashboard auf den ersten Blick?",
      targetId: "overview",
      theme: "overview",
    },
    {
      label: "Analyse",
      question:
        "Welche Verkehrsmittel werden genutzt und wie unterscheiden sich die Muster?",
      targetId: "analysis",
      theme: "analysis",
    },
    {
      label: "Freitext",
      question: "Welche Themen tauchen in den offenen Antworten besonders häufig auf?",
      targetId: "qualitative",
      theme: "analysis",
    },
    {
      label: "Karte",
      question: "Welche räumlichen Muster zeigen sich rund um die Universität?",
      targetId: "region",
      theme: "region",
    },
    {
      label: "Kontext",
      question:
        "Wie sind die Daten zu interpretieren und welche Grenzen haben sie?",
      targetId: "context",
      theme: "context",
    },
  ],
  climateContext: {
    eyebrow: "Treibhausgasbilanz 2022",
    title: "Pendelmobilität als Einstiegspunkt",
    text: "Das Dashboard konzentriert sich auf Pendelmobilität, weil Wege zur Universität in der Treibhausgasbilanz 2022 den größten ausgewiesenen Anteil ausmachen.",
    emphasis:
      "Wärme und Strom dienen hier nur als Vergleichskontext. Die folgenden Auswertungen konzentrieren sich auf Wege zur Universität.",
    items: [
      {
        label: "Pendeln von UR-Angehörigen",
        value: 52,
        tone: "primary",
      },
      {
        label: "Wärme",
        value: 34,
        tone: "secondary",
      },
      {
        label: "Strom",
        value: 9,
        tone: "muted",
      },
    ],
  },
  overviewSection: {
    eyebrow: "Überblick",
    title: "Datenbasis und erste Ergebnisse",
  },
  analysisSection: {
    eyebrow: "Analysen",
    title: "Kernanalysen zu Verkehrsmitteln und Pendelmustern",
    text: "Die folgenden Diagramme zeigen zentrale Ergebnisse der Umfrage und aktualisieren sich entsprechend der gewählten Filter.",
    readingAids: [
      {
        term: "n",
        text: "zeigt, wie viele Personen oder Fälle in der aktuellen Ansicht berücksichtigt werden.",
      },
      {
        term: "Prozentwerte",
        text: "beziehen sich auf die gerade sichtbare Auswahl.",
      },
      {
        term: "Zählweise",
        text: "kann je nach Ansicht Personen, Antworten oder vorbereitete Aussagen meinen.",
      },
      {
        term: "Filter",
        text: "ändern die Auswahl und damit auch n, Prozentwerte und absolute Werte.",
      },
    ],
  },
  regionSection: {
    eyebrow: "Region",
    title: "Regionale Perspektive",
    text: "Dieser Bereich zeigt, aus welchen Postleitzahlbereichen Teilnehmende zur Universität pendeln und wie sich Muster regional unterscheiden.",
    bullets: [
      "Herkunftsbereiche nach Postleitzahl betrachten",
      "Anteile, absolute Werte und n gemeinsam lesen",
      "Zusätzliche Details für ausgewählte Bereiche anzeigen",
    ],
  },
  contextSection: {
    eyebrow: "Kontext",
    title: "Datengrundlage und Einordnung",
    text: "Hier finden Sie zentrale Hinweise zur Umfrage, zur Datengrundlage und zur Interpretation der gezeigten Werte.",
    bullets: [
      "Umfragebasis, Stichprobengröße und Zeitraum",
      "Hinweise zu Prozentwerten, n und Mehrfachnennungen",
      "Begriffe und Quellenhinweise",
    ],
  },
};