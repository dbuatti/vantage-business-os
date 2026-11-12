import { describe, it, expect } from 'vitest';
import { stripInternalFields } from './supabase';

describe('stripInternalFields', () => {
  it('removes UI-only keys prefixed with an underscore', () => {
    const row = {
      transaction_date: '2026-10-28',
      description: 'Coffee',
      amount: -4.5,
      _isDuplicate: false,
      _autoWork: true,
      _autoNotes: true,
    };

    expect(stripInternalFields(row)).toEqual({
      transaction_date: '2026-10-28',
      description: 'Coffee',
      amount: -4.5,
    });
  });

  it('keeps real columns that merely start with an underscore-free name', () => {
    const row = { is_work: true, notes: '', mmm_yyyy: 'Oct 2026' };
    expect(stripInternalFields(row)).toEqual(row);
  });

  it('returns an empty object when every key is internal', () => {
    expect(stripInternalFields({ _isDuplicate: true })).toEqual({});
  });
});