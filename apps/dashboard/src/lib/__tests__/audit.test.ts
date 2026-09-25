import { describe, expect, it } from 'vitest';
import { formatAuditFields, formatAuditTitle, formatAuditWhen } from '../audit';

describe('audit display', () => {
  it('formats a settings create payload as labelled rows, not JSON', () => {
    const fields = formatAuditFields({
      key: 'send_money_number',
      value: '',
      updated_at: '2026-09-18T12:28:03.137+00:00',
      updated_by: null,
    });
    expect(fields).toEqual([
      { label: 'Setting', text: 'Send money number' },
      { label: 'Value', text: 'None' },
      { label: 'Updated', text: formatAuditWhen('2026-09-18T12:28:03.137+00:00') },
      { label: 'Updated by', text: 'None' },
    ]);
    expect(formatAuditTitle('create', 'settings')).toBe('Created settings');
  });
});
