import {
  type CreateTaskInput,
  type CreateTaskOutput,
  type GetTaskInput,
  type GetTaskOutput,
  type RunTaskInput,
  type RunTaskOutput,
  type ListTasksInput,
  type ListTasksOutput,
  type DomainError,
  type ExecutionContext,
} from '@oct/core';
import { err, ok, type Result } from 'neverthrow';

export interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Result<T, DomainError>> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json() as { ok: boolean; data?: T; error?: DomainError };

      if (!data.ok || !response.ok) {
        return err(data.error ?? {
          code: 'INTERNAL_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          retryable: true,
        } as DomainError);
      }

      return ok(data.data as T);
    } catch (error) {
      return err({
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        retryable: true,
      } as DomainError);
    }
  }

  // Task API methods

  async createTask(input: CreateTaskInput): Promise<Result<CreateTaskOutput, DomainError>> {
    return this.request<CreateTaskOutput>('POST', '/v1/tasks', input);
  }

  async getTask(input: GetTaskInput): Promise<Result<GetTaskOutput, DomainError>> {
    return this.request<GetTaskOutput>('GET', `/v1/tasks/${encodeURIComponent(input.taskId)}`);
  }

  async runTask(input: RunTaskInput): Promise<Result<RunTaskOutput, DomainError>> {
    return this.request<RunTaskOutput>('POST', `/v1/tasks/${encodeURIComponent(input.taskId)}/run`);
  }

  async listTasks(input: ListTasksInput): Promise<Result<ListTasksOutput, DomainError>> {
    const params = new URLSearchParams();
    if (input.limit) params.set('limit', input.limit.toString());
    if (input.cursor) params.set('cursor', input.cursor);

    const queryString = params.toString();
    const path = `/v1/tasks${queryString ? `?${queryString}` : ''}`;

    return this.request<ListTasksOutput>('GET', path);
  }
}

/**
 * Create an API client from execution context
 */
export function createApiClient(ctx: ExecutionContext, baseUrl?: string): ApiClient {
  const url = baseUrl ?? process.env.OCT_API_URL ?? 'http://localhost:3000';

  return new ApiClient({
    baseUrl: url,
    headers: {
      'x-actor-id': ctx.actorId,
      'x-workspace-id': ctx.workspaceId,
      'x-permissions': ctx.permissions.join(','),
      ...(ctx.traceId ? { 'x-trace-id': ctx.traceId } : {}),
    },
  });
}
