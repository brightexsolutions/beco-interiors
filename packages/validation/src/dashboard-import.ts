import { z } from 'zod';

/**
 * Starting a catalogue import from the dashboard. The two inputs are the
 * workflow's own, so a value the workflow would reject never leaves the
 * dashboard as a dispatch that fails somewhere nobody is looking.
 */
export const IMPORT_MODES = ['dry-run', 'import', 'force'] as const;
export const IMPORT_TARGETS = ['staging', 'production'] as const;

export type ImportMode = (typeof IMPORT_MODES)[number];
export type ImportTarget = (typeof IMPORT_TARGETS)[number];

export const startImportSchema = z.object({
  mode: z.enum(IMPORT_MODES, { message: 'Pick what the import should do' }),
  target: z.enum(IMPORT_TARGETS, { message: 'Pick staging or production' }),
});

export type StartImportInput = z.infer<typeof startImportSchema>;

export const IMPORT_MODE_LABEL: Record<ImportMode, string> = {
  'dry-run': 'Check only',
  import: 'Import',
  force: 'Re-encode everything',
};

export const IMPORT_MODE_HINT: Record<ImportMode, string> = {
  'dry-run': 'Lists what would change and what would be skipped. Writes nothing.',
  import: 'Downloads new and changed photographs, writes products and ranges.',
  force: 'Re-downloads and re-encodes every photograph. For after a change to the pipeline itself, not the folder. Slow.',
};
