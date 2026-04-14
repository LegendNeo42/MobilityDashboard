import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse, csvFormat } from 'd3-dsv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const privateDataDirectory = path.join(projectRoot, 'data-private');
const publicQualitativeOutputDirectory = path.join(
  projectRoot,
  'public',
  'data',
  'qualitative-data',
);

const rawInputPath = path.join(
  privateDataDirectory,
  'qualitative_feedback_plz.csv',
);
const normalizedOutputPath = path.join(
  privateDataDirectory,
  'qualitative_feedback_normalized.csv',
);
const droppedOutputPath = path.join(
  privateDataDirectory,
  'qualitative_feedback_dropped.csv',
);
const summaryOutputPath = path.join(
  publicQualitativeOutputDirectory,
  'qualitative_theme_summary.json',
);

const sourceFieldDefinitions = [
  {
    key: 'feedback_opnv',
    label: 'ÖPNV: Verbesserungswünsche',
    order: 1,
  },
  {
    key: 'feedback_no_opnv',
    label: 'ÖPNV: Gründe gegen Nutzung',
    order: 2,
  },
  {
    key: 'feedback_bicycle',
    label: 'Fahrrad: allgemeine Hinweise',
    order: 3,
  },
  {
    key: 'feedback_bicycle_campus',
    label: 'Fahrrad am Campus',
    order: 4,
  },
  {
    key: 'feedback_deutschlandticket',
    label: 'Deutschlandticket',
    order: 5,
  },
  {
    key: 'feedback_mobility',
    label: 'Allgemeines Mobilitätsfeedback',
    order: 6,
  },
  {
    key: 'feedback_car',
    label: 'Auto und Parken',
    order: 7,
  },
  {
    key: 'commute',
    label: 'Pendelkontext',
    order: 8,
  },
];

const dashboardStatusGroupDefinitions = [
  { key: 'student', label: 'Studierende', sourceStatuses: ['student'] },
  { key: 'employee', label: 'Mitarbeitende', sourceStatuses: ['wimi', 'niwi'] },
  { key: 'prof', label: 'Professor:innen', sourceStatuses: ['prof'] },
];

const themeDefinitions = [
  {
    key: 'public_transport_reliability_frequency_directness',
    label: 'ÖPNV: Zuverlässigkeit, Taktung und Direktverbindungen',
    order: 1,
  },
  {
    key: 'crowding',
    label: 'ÖPNV: Auslastung und Überfüllung',
    order: 2,
  },
  {
    key: 'ticketing_price',
    label: 'Tickets und Preise',
    order: 3,
  },
  {
    key: 'bicycle_safety',
    label: 'Fahrrad: Sicherheit',
    order: 4,
  },
  {
    key: 'bicycle_infrastructure_parking',
    label: 'Fahrrad: Infrastruktur und Stellplätze',
    order: 5,
  },
  {
    key: 'winter_conditions',
    label: 'Winter und Witterung',
    order: 6,
  },
  {
    key: 'parking_car_context',
    label: 'Parken und Auto-Kontext',
    order: 7,
  },
  {
    key: 'direct_connections_university_locations',
    label: 'Verbindungen zwischen Hochschulstandorten',
    order: 8,
  },
  {
    key: 'accessibility_campus_access',
    label: 'Barrierefreiheit und Zugang',
    order: 9,
  },
  {
    key: 'other_mobility_context',
    label: 'Sonstiger Mobilitätskontext',
    order: 10,
  },
];

const themeDefinitionByKey = new Map(
  themeDefinitions.map((definition) => [definition.key, definition]),
);

const quotesPerStatusGroup = 5;

const nonInformativeValues = new Set([
  '',
  '-',
  '--',
  '---',
  '.',
  '..',
  '...',
  '?',
  '??',
  '???',
  'keine',
  'keine.',
  'keine angabe',
  'keine angaben',
  'keine ahnung',
  'keine weiteren',
  'keine weiteren.',
  'k.a.',
  'ka',
  'nichts',
  'nichts.',
  'nix',
  'nö',
  'noe',
  'nein',
  'passt',
  'passt eigentlich',
  'passt soweit',
  'passt soweit.',
  'alles gut',
  'eigentlich nichts',
  'nichts besonderes',
  'nichts weiter',
  'nichts spezielles',
  'keine besonderen',
  'keine besonderen.',
]);

const nonInformativePatterns = [
  /^keine[,;:.\s-]*(siehe oben|siehe vorher)$/u,
  /^keine[,;:.\s-]*(oben|vorher)$/u,
  /^unn(o|oe)tig\b.*\bzu fu[ßs]\b/u,
];

const themeMatchers = {
  accessibility: [
    /\bbarriere\w*\b/u,
    /\brollstuhl\w*\b/u,
    /\bbehindert\w*\b/u,
    /\beingeschraenkt\w*\b/u,
    /\baufzug\w*\b/u,
    /\blift\w*\b/u,
  ],
  winter: [
    /\bwinter(?!semester)\w*\b/u,
    /\bschnee\w*\b/u,
    /\beis\w*\b/u,
    /\bglaett\w*\b/u,
    /\bglatt\w*\b/u,
    /\bsplitt\w*\b/u,
    /\bgestreu\w*\b/u,
    /\braeum\w*\b/u,
  ],
  directConnections: [
    /\bnordcampus\b/u,
    /\bsuedcampus\b/u,
    /\bklinikum\b/u,
    /\bpt-gebaeude\b/u,
    /\bpt gebaeude\b/u,
    /\bverbindung zwischen\b/u,
    /\bzwischen den standorten\b/u,
    /\bdurchquer\w* campus\b/u,
    /\bcampus\b.*\btreppe\w*\b/u,
    /\btreppe\w*\b.*\bcampus\b/u,
    /\bcampus\b.*\bumweg\w*\b/u,
    /\bumweg\w*\b.*\bcampus\b/u,
  ],
  parking: [
    /\bparkplatz\w*\b/u,
    /\bparkgebuehr\w*\b/u,
    /\bparkhaus\w*\b/u,
    /\btiefgarage\w*\b/u,
    /\bwallbox\w*\b/u,
    /\bparken\b/u,
  ],
  bicycleSafety: [
    /\bunsicher\w*\b/u,
    /\bgefaehr\w*\b/u,
    /\bangefahr\w*\b/u,
    /\bunfall\w*\b/u,
    /\bsturz\w*\b/u,
    /\bfast angefahren\b/u,
  ],
  bicycleInfrastructure: [
    /\bradweg\w*\b/u,
    /\bfahrradweg\w*\b/u,
    /\bradstreifen\w*\b/u,
    /\bfahrradstreifen\w*\b/u,
    /\bstellplatz\w*\b/u,
    /\babstell\w*\b/u,
    /\bfahrradstaend\w*\b/u,
    /\bfahrradgarage\w*\b/u,
    /\breparaturstation\w*\b/u,
    /\bdusche\w*\b/u,
    /\blademoeg\w*\b/u,
    /\bleihfahrrad\w*\b/u,
    /\blastenrad\w*\b/u,
    /\bzufahrt\w*\b/u,
    /\bueberdacht\w*\b.*\b(stellplatz|abstell|fahrrad|rad)\w*\b/u,
    /\b(stellplatz|abstell|fahrrad|rad)\w*\b.*\bueberdacht\w*\b/u,
    /\bgarage\w*\b.*\b(fahrrad|rad)\w*\b/u,
    /\b(fahrrad|rad)\w*\b.*\bgarage\w*\b/u,
    /\bbike lane\w*\b/u,
    /\bcycling lane\w*\b/u,
    /\bcycle lane\w*\b/u,
    /\bcycling route\w*\b/u,
    /\bcycle route\w*\b/u,
    /\bbike route\w*\b/u,
    /\bcycling path\w*\b/u,
    /\bcycle path\w*\b/u,
    /\bbike path\w*\b/u,
    /\bbike parking\w*\b/u,
    /\bbicycle parking\w*\b/u,
    /\bbike rack\w*\b/u,
    /\bbicycle rack\w*\b/u,
    /\bbike rental\w*\b/u,
    /\bbicycle rental\w*\b/u,
    /\bbike sharing\w*\b/u,
    /\bbicycle sharing\w*\b/u,
  ],
  ticketing: [
    /\bdeutschlandticket\b/u,
    /\bjobticket\b/u,
    /\bticket\w*\b/u,
    /\bpreis\w*\b/u,
    /\bteuer\w*\b/u,
    /\bbezuschuss\w*\b/u,
    /\bfinanzier\w*\b/u,
    /\bumsonst\b/u,
    /\bkostenlos\b/u,
    /\bsubvent\w*\b/u,
  ],
  publicTransport: [
    /\btakt\w*\b/u,
    /\bhaeufig\w*\b/u,
    /\bfrequenz\w*\b/u,
    /\bselten\w*\b/u,
    /\bzuverlaess\w*\b/u,
    /\bverspaet\w*\b/u,
    /\bausfall\w*\b/u,
    /\bumstieg\w*\b/u,
    /\bdirektverbindung\w*\b/u,
    /\bdirekte verbind\w*\b/u,
    /\banschluss\w*\b/u,
    /\bverbindung\w*\b/u,
    /\bhaltest\w*\b/u,
    /\bbahnhof\w*\b/u,
    /\bbus\w*\b/u,
    /\bbahn\w*\b/u,
    /\bzug\w*\b/u,
    /\bopnv\b/u,
    /\boepnv\b/u,
    /\brvv\b/u,
    /\bfahrplan\w*\b/u,
    /\bstadtbahn\w*\b/u,
    /\bstrassenbahn\w*\b/u,
    /\btram\w*\b/u,
    /\bshuttle\w*\b/u,
    /\bcampusbus\w*\b/u,
  ],
  crowding: [
    /\bzu voll\b/u,
    /\bueberfuell\w*\b/u,
    /\bgedraeng\w*\b/u,
    /\bueberlast\w*\b/u,
  ],
  alternativeMode: [
    /\bzu fuss\b/u,
    /\bzu fu[ßs]\b/u,
    /\blieber rad\b/u,
    /\blieber fahrrad\b/u,
    /\bmit dem rad\b/u,
    /\bich laufe\b/u,
    /\bwohne nah\b/u,
  ],
};

function normalizeWhitespace(value) {
  return (value ?? '').replace(/\s+/gu, ' ').trim();
}

function normalizeForMatch(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss');
}

function getDashboardStatusGroup(rawStatus) {
  for (const definition of dashboardStatusGroupDefinitions) {
    if (definition.sourceStatuses.includes(rawStatus)) {
      return definition;
    }
  }

  return null;
}

function getExcludedEmploymentStatusKey(rawStatus) {
  const normalized = normalizeWhitespace(rawStatus);
  return normalized || 'unknown';
}

function getExcludedEmploymentStatusLabel(rawStatus) {
  const normalized = normalizeWhitespace(rawStatus);
  return normalized || 'Unknown / empty status';
}

function hasMatcher(matchers, value) {
  return matchers.some((matcher) => matcher.test(value));
}

function isMeaningfulComment(comment) {
  const normalized = normalizeForMatch(comment);

  if (!normalized) return false;
  if (nonInformativeValues.has(normalized)) return false;
  if (nonInformativePatterns.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return /[a-z]/u.test(normalized);
}

function getDropReason(comment) {
  const normalized = normalizeForMatch(comment);

  if (!normalized) {
    return 'empty_after_normalization';
  }

  if (nonInformativeValues.has(normalized)) {
    return 'exact_non_informative_value';
  }

  if (nonInformativePatterns.some((pattern) => pattern.test(normalized))) {
    return 'matched_non_informative_pattern';
  }

  if (!/[a-z]/u.test(normalized)) {
    return 'no_letter_content';
  }

  return 'non_informative_comment';
}

function isBicycleSourceField(sourceField) {
  return (
    sourceField === 'feedback_bicycle' ||
    sourceField === 'feedback_bicycle_campus'
  );
}

function assignTheme(sourceField, comment) {
  const normalized = normalizeForMatch(comment);
  const isBicycleSource = isBicycleSourceField(sourceField);

  const hasBicycleContext =
    isBicycleSource ||
    sourceField === 'commute' ||
    /\b(rad|fahrrad|bike|cycling|cycle)\w*\b/u.test(normalized);

  if (hasMatcher(themeMatchers.accessibility, normalized)) {
    return 'accessibility_campus_access';
  }

  if (hasMatcher(themeMatchers.winter, normalized)) {
    return 'winter_conditions';
  }

  if (hasMatcher(themeMatchers.directConnections, normalized)) {
    return 'direct_connections_university_locations';
  }

  if (
    hasMatcher(themeMatchers.bicycleSafety, normalized) ||
    (hasBicycleContext &&
      /\b(dunkel|beleucht|kreuzung|sicherer weg)\w*\b/u.test(normalized))
  ) {
    return 'bicycle_safety';
  }

  if (hasMatcher(themeMatchers.bicycleInfrastructure, normalized)) {
    return 'bicycle_infrastructure_parking';
  }

  // In bicycle-specific source fields, parking-related words usually refer to
  // bicycle parking or access rather than the generic car-parking context.
  if (isBicycleSource && hasMatcher(themeMatchers.parking, normalized)) {
    return 'bicycle_infrastructure_parking';
  }

  if (
    hasMatcher(themeMatchers.parking, normalized) ||
    (sourceField === 'feedback_car' && /\bauto\w*\b/u.test(normalized))
  ) {
    return 'parking_car_context';
  }

  if (
    hasMatcher(themeMatchers.ticketing, normalized) ||
    (sourceField === 'feedback_deutschlandticket' &&
      /\b(kosten|preis|teuer|finanz|ticket|bezuschuss|umsonst|kostenlos)\w*\b/u.test(
        normalized,
      ))
  ) {
    return 'ticketing_price';
  }

  if (
    hasMatcher(themeMatchers.crowding, normalized) &&
    (sourceField === 'feedback_opnv' ||
      sourceField === 'feedback_no_opnv' ||
      sourceField === 'feedback_deutschlandticket') &&
    hasMatcher(themeMatchers.publicTransport, normalized)
  ) {
    return 'crowding';
  }

  // Bicycle-specific fields should stay within the bicycle-related theme family
  // unless a clearer earlier rule has already matched.
  if (isBicycleSource) {
    return 'bicycle_infrastructure_parking';
  }

  if (hasMatcher(themeMatchers.publicTransport, normalized)) {
    return 'public_transport_reliability_frequency_directness';
  }

  if (
    sourceField === 'feedback_opnv' ||
    sourceField === 'feedback_deutschlandticket'
  ) {
    if (hasMatcher(themeMatchers.alternativeMode, normalized)) {
      return 'other_mobility_context';
    }

    return 'public_transport_reliability_frequency_directness';
  }

  if (sourceField === 'feedback_no_opnv') {
    if (hasMatcher(themeMatchers.alternativeMode, normalized)) {
      return 'other_mobility_context';
    }

    return 'public_transport_reliability_frequency_directness';
  }

  if (sourceField === 'feedback_car') {
    return 'parking_car_context';
  }

  return 'other_mobility_context';
}

function scoreQuoteCandidate(statement) {
  const length = statement.comment_clean.length;
  const targetLength = 140;
  const lengthPenalty = Math.abs(length - targetLength);
  const sourceFieldPenalty = statement.source_field_order * 2;

  return lengthPenalty + sourceFieldPenalty;
}

function isQuoteCandidate(statement) {
  const length = statement.comment_clean.length;

  if (length < 50 || length > 260) {
    return false;
  }

  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(statement.comment_clean)) {
    return false;
  }

  if (/https?:\/\//u.test(statement.comment_clean)) {
    return false;
  }

  return true;
}

function summarizeExcludedEmploymentStatuses(statements) {
  const map = new Map();

  for (const statement of statements) {
    if (statement.status_group) continue;

    const key = getExcludedEmploymentStatusKey(statement.employment_status);
    const existing = map.get(key) ?? {
      key,
      label: getExcludedEmploymentStatusLabel(statement.employment_status),
      statements: 0,
      participantIds: new Set(),
    };

    existing.statements += 1;

    if (statement.participant_id) {
      existing.participantIds.add(statement.participant_id);
    }

    map.set(key, existing);
  }

  return [...map.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      statements: entry.statements,
      participants: entry.participantIds.size,
    }))
    .sort((a, b) => {
      if (b.statements !== a.statements) return b.statements - a.statements;
      return a.label.localeCompare(b.label, 'de');
    });
}

function buildDashboardStatusGroupParticipantTotals(rows) {
  return dashboardStatusGroupDefinitions.map((definition) => {
    const participantIds = new Set();

    for (const row of rows) {
      const participantId = normalizeWhitespace(row.id);
      const employmentStatus = normalizeWhitespace(row.employment_status);
      const statusGroup = getDashboardStatusGroup(employmentStatus);

      if (statusGroup?.key !== definition.key) continue;
      if (!participantId) continue;

      participantIds.add(participantId);
    }

    return {
      key: definition.key,
      label: definition.label,
      participants: participantIds.size,
    };
  });
}

function buildPreparedStatements(rows) {
  const preparedStatements = [];
  const droppedStatements = [];

  for (const rawRow of rows) {
    const participantId = normalizeWhitespace(rawRow.id);
    const employmentStatus = normalizeWhitespace(rawRow.employment_status);
    const statusGroup = getDashboardStatusGroup(employmentStatus);
    const rawRowIndex = normalizeWhitespace(rawRow['']);
    const standort = normalizeWhitespace(rawRow.standort);
    const standortSonstige = normalizeWhitespace(rawRow.standort_sonstige);
    const plz = normalizeWhitespace(rawRow.plz);
    const language = normalizeWhitespace(rawRow.LANGUAGE);

    for (const sourceFieldDefinition of sourceFieldDefinitions) {
      const originalComment = normalizeWhitespace(rawRow[sourceFieldDefinition.key]);
      if (!originalComment) continue;

      if (!isMeaningfulComment(originalComment)) {
        droppedStatements.push({
          entry_id: `${rawRowIndex || participantId || 'row'}_${sourceFieldDefinition.key}`,
          raw_row_index: rawRowIndex,
          participant_id: participantId,
          employment_status: employmentStatus,
          status_group: statusGroup?.key ?? '',
          status_group_label: statusGroup?.label ?? '',
          source_field: sourceFieldDefinition.key,
          source_field_label: sourceFieldDefinition.label,
          comment_original: originalComment,
          comment_clean: normalizeForMatch(originalComment),
          drop_reason: getDropReason(originalComment),
          standort,
          standort_sonstige: standortSonstige,
          plz,
          language,
        });

        continue;
      }

      const themeKey = assignTheme(sourceFieldDefinition.key, originalComment);
      const themeDefinition = themeDefinitionByKey.get(themeKey);

      if (!themeDefinition) {
        throw new Error(`Unknown qualitative theme: ${themeKey}`);
      }

      preparedStatements.push({
        entry_id: `${rawRowIndex || participantId || 'row'}_${sourceFieldDefinition.key}`,
        raw_row_index: rawRowIndex,
        participant_id: participantId,
        employment_status: employmentStatus,
        status_group: statusGroup?.key ?? '',
        status_group_label: statusGroup?.label ?? '',
        source_field: sourceFieldDefinition.key,
        source_field_label: sourceFieldDefinition.label,
        source_field_order: sourceFieldDefinition.order,
        comment_original: originalComment,
        comment_clean: originalComment,
        theme: themeDefinition.key,
        theme_label: themeDefinition.label,
        theme_order: themeDefinition.order,
        standort,
        standort_sonstige: standortSonstige,
        plz,
        language,
      });
    }
  }

  preparedStatements.sort((a, b) => {
    if (a.theme_order !== b.theme_order) return a.theme_order - b.theme_order;
    if (a.source_field_order !== b.source_field_order) {
      return a.source_field_order - b.source_field_order;
    }

    return a.entry_id.localeCompare(b.entry_id, 'de');
  });

  droppedStatements.sort((a, b) => a.entry_id.localeCompare(b.entry_id, 'de'));

  return {
    preparedStatements,
    droppedStatements,
  };
}

function buildThemeSummary(
  preparedStatements,
  rawParticipantCount,
  excludedStatements,
  dashboardStatusGroupParticipantTotals,
) {
  const participantsWithPreparedStatements = new Set();
  const dashboardSelectableParticipants = new Set();
  const excludedStatusParticipants = new Set();
  const themeSummaries = [];

  const sourceFieldTotals = sourceFieldDefinitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    order: definition.order,
    statements: 0,
  }));
  const sourceFieldTotalByKey = new Map(
    sourceFieldTotals.map((entry) => [entry.key, entry]),
  );

  for (const statement of preparedStatements) {
    if (statement.participant_id) {
      participantsWithPreparedStatements.add(statement.participant_id);

      if (statement.status_group) {
        dashboardSelectableParticipants.add(statement.participant_id);
      } else {
        excludedStatusParticipants.add(statement.participant_id);
      }
    }

    sourceFieldTotalByKey.get(statement.source_field).statements += 1;
  }

  const dashboardSelectableStatements = preparedStatements.filter(
    (statement) => Boolean(statement.status_group),
  );
  const dashboardSelectableStatementCount = dashboardSelectableStatements.length;
  const excludedStatusStatementCount =
    preparedStatements.length - dashboardSelectableStatementCount;
  const excludedEmploymentStatuses =
    summarizeExcludedEmploymentStatuses(preparedStatements);

  for (const themeDefinition of themeDefinitions) {
    const allThemeStatements = preparedStatements.filter(
      (statement) => statement.theme === themeDefinition.key,
    );
    const selectableThemeStatements = allThemeStatements.filter((statement) =>
      Boolean(statement.status_group),
    );
    const excludedThemeStatements = allThemeStatements.filter(
      (statement) => !statement.status_group,
    );

    const selectableParticipantIds = new Set(
      selectableThemeStatements
        .map((statement) => statement.participant_id)
        .filter(Boolean),
    );
    const excludedThemeParticipantIds = new Set(
      excludedThemeStatements.map((statement) => statement.participant_id).filter(Boolean),
    );

    const statusGroupSummaries = dashboardStatusGroupDefinitions
      .map((groupDefinition) => {
        const groupStatements = selectableThemeStatements.filter(
          (statement) => statement.status_group === groupDefinition.key,
        );
        const groupParticipantIds = new Set(
          groupStatements.map((statement) => statement.participant_id).filter(Boolean),
        );

        return {
          key: groupDefinition.key,
          label: groupDefinition.label,
          statements: groupStatements.length,
          participants: groupParticipantIds.size,
        };
      })
      .filter((groupSummary) => groupSummary.statements > 0)
      .sort((a, b) => b.statements - a.statements || a.label.localeCompare(b.label, 'de'));

    const sourceFieldSummaries = sourceFieldDefinitions
      .map((sourceFieldDefinition) => ({
        key: sourceFieldDefinition.key,
        label: sourceFieldDefinition.label,
        order: sourceFieldDefinition.order,
        statements: selectableThemeStatements.filter(
          (statement) => statement.source_field === sourceFieldDefinition.key,
        ).length,
      }))
      .filter((entry) => entry.statements > 0)
      .sort((a, b) => {
        if (b.statements !== a.statements) return b.statements - a.statements;
        return a.order - b.order;
      })
      .map(({ order, ...entry }) => entry);

    const quotes = dashboardStatusGroupDefinitions.flatMap((groupDefinition) => {
      return selectableThemeStatements
        .filter((statement) => statement.status_group === groupDefinition.key)
        .filter(isQuoteCandidate)
        .sort((a, b) => scoreQuoteCandidate(a) - scoreQuoteCandidate(b))
        .filter((statement, index, list) => {
          const firstIndex = list.findIndex(
            (candidate) => candidate.comment_clean === statement.comment_clean,
          );
          return firstIndex === index;
        })
        .slice(0, quotesPerStatusGroup)
        .map((statement) => ({
          text: statement.comment_clean,
          sourceField: statement.source_field,
          sourceFieldLabel: statement.source_field_label,
          statusGroup: statement.status_group || null,
          statusGroupLabel: statement.status_group_label || null,
        }));
    });

    themeSummaries.push({
      key: themeDefinition.key,
      label: themeDefinition.label,
      order: themeDefinition.order,
      statements: selectableThemeStatements.length,
      participants: selectableParticipantIds.size,
      shareOfDashboardSelectableStatements:
        dashboardSelectableStatementCount > 0
          ? Number(
              (
                (selectableThemeStatements.length / dashboardSelectableStatementCount) *
                100
              ).toFixed(2),
            )
          : 0,
      statusGroups: statusGroupSummaries,
      excludedStatusStatements: excludedThemeStatements.length,
      excludedStatusParticipants: excludedThemeParticipantIds.size,
      excludedEmploymentStatuses:
        summarizeExcludedEmploymentStatuses(allThemeStatements),
      sourceFields: sourceFieldSummaries,
      quotes,
    });
  }

  const rankedThemes = [...themeSummaries].sort((a, b) => {
    if (b.statements !== a.statements) return b.statements - a.statements;
    return a.order - b.order;
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceFile: 'qualitative_feedback_plz.csv',
    includedSourceFields: sourceFieldDefinitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      order: definition.order,
      statements: sourceFieldTotalByKey.get(definition.key).statements,
    })),
    totals: {
      rawParticipants: rawParticipantCount,
      preparedStatements: preparedStatements.length,
      excludedStatements,
      participantsWithPreparedStatements: participantsWithPreparedStatements.size,
      dashboardSelectableStatements: dashboardSelectableStatementCount,
      dashboardSelectableParticipants: dashboardSelectableParticipants.size,
      dashboardSelectableStatusGroups: dashboardStatusGroupParticipantTotals,
      excludedStatusStatements: excludedStatusStatementCount,
      excludedStatusParticipants: excludedStatusParticipants.size,
      excludedEmploymentStatuses,
    },
    themes: rankedThemes,
  };
}

async function main() {
  const rawCsvText = await readFile(rawInputPath, 'utf8');
  const rawRows = csvParse(rawCsvText);

  const { preparedStatements, droppedStatements } = buildPreparedStatements(rawRows);
  const dashboardStatusGroupParticipantTotals =
    buildDashboardStatusGroupParticipantTotals(rawRows);

  const summary = buildThemeSummary(
    preparedStatements,
    rawRows.length,
    droppedStatements.length,
    dashboardStatusGroupParticipantTotals,
  );

  await mkdir(privateDataDirectory, { recursive: true });
  await mkdir(publicQualitativeOutputDirectory, { recursive: true });

  await writeFile(normalizedOutputPath, csvFormat(preparedStatements), 'utf8');
  await writeFile(droppedOutputPath, csvFormat(droppedStatements), 'utf8');
  await writeFile(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(
    `Prepared ${preparedStatements.length} qualitative statements across ${summary.themes.length} themes and dropped ${droppedStatements.length} non-informative statements.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});