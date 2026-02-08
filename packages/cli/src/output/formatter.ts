import type { DomainError } from '@oct/core';

export interface OutputFormatter<T> {
  success(data: T): void;
  error(err: DomainError): void;
}

export class JsonFormatter<T> implements OutputFormatter<T> {
  success(data: T): void {
    console.log(JSON.stringify({ ok: true, data }, null, 2));
  }

  error(err: DomainError): void {
    console.log(JSON.stringify({ ok: false, error: err }, null, 2));
  }
}

export class HumanFormatter<T> implements OutputFormatter<T> {
  private chalk: typeof import('chalk') | null = null;

  constructor() {
    // Dynamically import chalk to avoid issues if not installed
    import('chalk').then(m => {
      this.chalk = m.default;
    }).catch(() => {
      // chalk not available, use plain text
    });
  }

  success(data: T): void {
    const c = this.chalk;
    if (c) {
      console.log(c.green('✓ Success'));
    } else {
      console.log('Success');
    }
    console.log(this.formatData(data));
  }

  error(err: DomainError): void {
    const c = this.chalk;
    if (c) {
      console.error(c.red(`✗ Error: ${err.code}`));
      console.error(c.red(err.message));
    } else {
      console.error(`Error: ${err.code}`);
      console.error(err.message);
    }
    if (err.details && Object.keys(err.details).length > 0) {
      console.error('Details:', err.details);
    }
  }

  private formatData(data: unknown): string {
    if (data === null || data === undefined) {
      return '';
    }
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data, null, 2);
  }
}

export function createFormatter<T>(json: boolean): OutputFormatter<T> {
  return json ? new JsonFormatter<T>() : new HumanFormatter<T>();
}

export function getExitCode(errorCode: string): number {
  const exitCodes: Record<string, number> = {
    'SUCCESS': 0,
    'INVALID_INPUT': 1,
    'NOT_FOUND': 2,
    'UNAUTHORIZED': 3,
    'FORBIDDEN': 4,
    'CONFLICT': 5,
    'INTERNAL_ERROR': 6,
  };
  return exitCodes[errorCode] ?? 6;
}
