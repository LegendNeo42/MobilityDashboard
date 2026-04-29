export const dashboardContent = {
  title: "Unterwegs zur Universität Regensburg",
  hook:
    "Wenn Pendelmobilität einen großen Teil der universitätsbezogenen Emissionen verursacht, lohnt sich ein genauer Blick auf Wege, Distanzen und Barrieren.",
  subtitle:
    "Dieses Dashboard macht sichtbar, wie Angehörige der Universität Regensburg zur Universität pendeln und wo sich Ansatzpunkte für Veränderung zeigen.",
  intro:
    "Es zeigt Ergebnisse der Mobilitätsumfrage im Wintersemester 2024/25 und verbindet den schnellen Überblick mit vertiefenden Analysen zu Verkehrsmitteln, Entfernungen, regionalen Mustern und Hürden.",
  heroQuestions: [
    {
      question: "Wie unterscheiden sich Pendelmuster nach Personengruppe?",
      targetId: "analysis",
      area: "Analysecharts",
    },
    {
      question: "Ab welcher Distanz verschieben sich die genutzten Verkehrsmittel?",
      targetId: "distance",
      area: "Verkehrsmittel & Distanz",
    },
    {
      question: "Welche Probleme und Verbesserungsbedarfe werden sichtbar?",
      targetId: "reasons",
      area: "Hürden & Verbesserungen",
    },
    {
      question: "Welche Themen tauchen in offenen Antworten auf?",
      targetId: "qualitative",
      area: "Qualitative Hinweise",
    },
    {
      question: "Aus welchen PLZ-Bereichen pendeln Teilnehmende zur Universität?",
      targetId: "region",
      area: "Regionale PLZ-Karte",
    },
  ],
  climateContext: {
    eyebrow: "Treibhausgasbilanz 2022",
    title: "Pendelmobilität als Einstiegspunkt",
    text: "Die Grafik greift Pendelmobilität auf, weil sie in der Treibhausgasbilanz der Universität Regensburg die größte ausgewiesene Kategorie ist.",
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