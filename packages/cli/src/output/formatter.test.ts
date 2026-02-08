import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JsonFormatter, HumanFormatter, createFormatter, getExitCode } from './formatter.js';
import type { DomainError } from '@oct/core';

describe('Output Formatter', () => {
  describe('JsonFormatter', () => {
    let formatter: JsonFormatter<{ message: string }>;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      formatter = new JsonFormatter<{ message: string }>();
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should output valid JSON on success', () => {
      formatter.success({ message: 'Hello' });

      expect(consoleSpy).toHaveBeenCalledOnce();
      const output = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should return {ok: true, data: ...} on success', () => {
      formatter.success({ message: 'Hello' });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toEqual({
        ok: true,
        data: { message: 'Hello' },
      });
    });

    it('should return {ok: false, error: ...} on error', () => {
      const error: DomainError = {
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
      };
      formatter.error(error);

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found',
          retryable: false,
        },
      });
    });

    it('should include error details when present', () => {
      const error: DomainError = {
        code: 'INVALID_INPUT',
        message: 'Invalid input',
        retryable: false,
        details: { field: 'title' },
      };
      formatter.error(error);

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.error.details).toEqual({ field: 'title' });
    });
  });

  describe('HumanFormatter', () => {
    let formatter: HumanFormatter<{ message: string }>;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      formatter = new HumanFormatter<{ message: string }>();
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should output success message', () => {
      formatter.success({ message: 'Hello' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(output).toContain('Success');
    });

    it('should output data on success', () => {
      formatter.success({ message: 'Hello' });

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(output).toContain('Hello');
    });

    it('should output error code on error', () => {
      const error: DomainError = {
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
      };
      formatter.error(error);

      const output = consoleErrorSpy.mock.calls.map(c => c[0]).join(' ');
      expect(output).toContain('NOT_FOUND');
    });

    it('should output error message on error', () => {
      const error: DomainError = {
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
      };
      formatter.error(error);

      const output = consoleErrorSpy.mock.calls.map(c => c[0]).join(' ');
      expect(output).toContain('Task not found');
    });

    it('should output error details when present', () => {
      const error: DomainError = {
        code: 'INVALID_INPUT',
        message: 'Invalid input',
        retryable: false,
        details: { field: 'title' },
      };
      formatter.error(error);

      const output = consoleErrorSpy.mock.calls.map(c => c[0]).join(' ');
      expect(output).toContain('Details');
    });
  });

  describe('createFormatter', () => {
    it('should return JsonFormatter when json is true', () => {
      const formatter = createFormatter(true);
      expect(formatter).toBeInstanceOf(JsonFormatter);
    });

    it('should return HumanFormatter when json is false', () => {
      const formatter = createFormatter(false);
      expect(formatter).toBeInstanceOf(HumanFormatter);
    });
  });

  describe('getExitCode', () => {
    it('should return 0 for success (no error)', () => {
      // When there's no error, the CLI exits with 0 by default
      expect(getExitCode('SUCCESS')).toBe(0);
    });

    it('should return 1 for INVALID_INPUT', () => {
      expect(getExitCode('INVALID_INPUT')).toBe(1);
    });

    it('should return 2 for NOT_FOUND', () => {
      expect(getExitCode('NOT_FOUND')).toBe(2);
    });

    it('should return 3 for UNAUTHORIZED', () => {
      expect(getExitCode('UNAUTHORIZED')).toBe(3);
    });

    it('should return 4 for FORBIDDEN', () => {
      expect(getExitCode('FORBIDDEN')).toBe(4);
    });

    it('should return 5 for CONFLICT', () => {
      expect(getExitCode('CONFLICT')).toBe(5);
    });

    it('should return 6 for INTERNAL_ERROR', () => {
      expect(getExitCode('INTERNAL_ERROR')).toBe(6);
    });

    it('should return 6 for unknown error codes', () => {
      expect(getExitCode('UNKNOWN')).toBe(6);
    });
  });
});
