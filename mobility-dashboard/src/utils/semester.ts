const SEMESTER_TIME_LABELS: Record<string, string> = {
  ws_vl: "WS (Vorlesungszeit)",
  ws_free: "WS (vorlesungsfrei)",
  ss_vl: "SS (Vorlesungszeit)",
  ss_free: "SS (vorlesungsfrei)",
};

export const semesterTimeOrder = ["ws_vl", "ws_free", "ss_vl", "ss_free"];

export function formatSemesterTime(value: string): string {
  return SEMESTER_TIME_LABELS[value] ?? value;
}

export function sortSemesterTimes(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const aIndex = semesterTimeOrder.indexOf(a);
    const bIndex = semesterTimeOrder.indexOf(b);

    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });
}