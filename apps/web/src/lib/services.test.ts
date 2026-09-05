import { describe, expect, it } from 'vitest';
import { resolveServices } from './services';

describe('service registry', () => {
  it('keeps modules disabled unless flagged', () => {
    expect(resolveServices({}).every((s) => !s.enabled)).toBe(true);
    expect(resolveServices({ tasks: true }).find((s) => s.id === 'tasks')?.enabled).toBe(true);
  });
});
