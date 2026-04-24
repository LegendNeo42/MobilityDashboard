export const dashboardContent = {
  title: "Unterwegs zur Universität Regensburg",
  hook:
    "Wenn Pendelmobilität einen großen Teil der universitätsbezogenen Emissionen verursacht, lohnt sich ein genauer Blick auf Wege, Distanzen und Barrieren.",
  subtitle:
    "Dieses Dashboard macht sichtbar, wie Angehörige der Universität Regensburg zur Universität pendeln und wo sich Ansatzpunkte für Veränderung zeigen.",
  intro:
  "Es zeigt Ergebnisse der Mobilitätsumfrage im Wintersemester 2024/25 und verbindet den schnellen Überblick mit vertiefenden Analysen zu Verkehrsmitteln, Entfernungen, regionalen Mustern und Hürden.",
  heroQuestions: [
    "Wie unterscheiden sich Pendelmuster nach Personengruppe?",
    "Ab welcher Distanz verschieben sich die genutzten Verkehrsmittel?",
    "Welche Probleme und Verbesserungsbedarfe werden sichtbar?",
    "Aus welchen PLZ-Bereichen pendeln Teilnehmende zur Universität?",
  ],
  climateContext: {
    eyebrow: "Treibhausgasbilanz 2022",
    title: "Pendelmobilität ist ein zentraler Hebel",
    text: "In der Treibhausgasbilanz der Universität Regensburg entfällt der größte ausgewiesene Anteil auf die Pendelmobilität von UR-Angehörigen.",
    emphasis:
      "Das Dashboard hilft dabei, diese Wege differenzierter zu verstehen statt sie nur als Gesamtwert zu betrachten.",
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