import { describe, expect, it } from 'vitest';
import { IMPORT_MODES, IMPORT_MODE_HINT, IMPORT_MODE_LABEL, startImportSchema } from '../dashboard-import';

describe('startImportSchema', () => {
  it('accepts exactly the workflow\'s own inputs', () => {
    expect(startImportSchema.parse({ mode: 'dry-run', target: 'staging' })).toEqual({ mode: 'dry-run', target: 'staging' });
    expect(startImportSchema.parse({ mode: 'force', target: 'production' })).toEqual({ mode: 'force', target: 'production' });
  });

  it('refuses anything the workflow would not recognise, with a sentence', () => {
    const mode = startImportSchema.safeParse({ mode: 'wipe', target: 'staging' });
    expect(mode.success).toBe(false);
    expect(mode.error?.issues[0]?.message).toBe('Pick what the import should do');
    const target = startImportSchema.safeParse({ mode: 'import', target: 'live' });
    expect(target.error?.issues[0]?.message).toBe('Pick staging or production');
  });

  it('carries a label and a hint for every mode, so the screen cannot show a bare value', () => {
    for (const mode of IMPORT_MODES) {
      expect(IMPORT_MODE_LABEL[mode]).toBeTruthy();
      expect(IMPORT_MODE_HINT[mode]).toMatch(/\.$/);
    }
  });
});
