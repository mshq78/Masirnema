import { ParsedParticipants, parseParticipantRows } from './participants';

/** Reads the first sheet of an .xlsx file in the browser and extracts participants. */
export async function readParticipantsFromExcel(file: File): Promise<ParsedParticipants> {
  const { readSheet } = await import('read-excel-file/browser');
  const rows = (await readSheet(file)) as unknown[][];
  return parseParticipantRows(rows);
}
