export const dashboardContent = {
  title: "Mobilitätsdashboard",
  subtitle:
    "Interaktives Dashboard zur Exploration der Mobilitätsumfrage der Universität Regensburg.",
  intro:
    "Erkunden Sie zentrale Ergebnisse der Mobilitätsumfrage und vergleichen Sie Muster nach Personengruppen, Verkehrsmitteln und weiteren Merkmalen.",
  sectionLinks: [
    {
      id: "overview",
      theme: "overview",
      eyebrow: "Einstieg",
      title: "Überblick",
      text: "Zentrale Bereiche des Dashboards auf einen Blick.",
      action: "Zum Abschnitt",
    },
    {
      id: "analysis",
      theme: "analysis",
      eyebrow: "Analysen",
      title: "Kerncharts",
      text: "Vergleichen Sie Verkehrsmittel und weitere Muster in den Umfragedaten.",
      action: "Zu den Charts",
    },
    {
      id: "region",
      theme: "region",
      eyebrow: "Region",
      title: "PLZ-Perspektive",
      text: "Räumliche Unterschiede und Herkunftsbereiche im Überblick.",
      action: "Zur Regionalsicht",
    },
    {
      id: "context",
      theme: "context",
      eyebrow: "Kontext",
      title: "Einordnung",
      text: "Hinweise zur Datengrundlage und zur Interpretation der Ergebnisse.",
      action: "Zum Kontext",
    },
  ],
  overviewSection: {
    eyebrow: "Überblick",
    title: "Schneller Einstieg in die wichtigsten Bereiche",
    text: "Von hier aus gelangen Sie zu den zentralen Auswertungen, räumlichen Perspektiven und methodischen Hinweisen.",
  },
  analysisSection: {
    eyebrow: "Analysen",
    title: "Kernanalysen zu Verkehrsmitteln und Pendelmustern",
    text: "Die folgenden Diagramme zeigen zentrale Ergebnisse der Umfrage und aktualisieren sich entsprechend der gewählten Filter.",
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