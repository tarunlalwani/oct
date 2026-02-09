import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { StorageAdapter } from '@oct/core';
import {
  handleWorkerCreate,
  handleWorkerList,
  handleWorkerGet,
  handleWorkerDelete,
} from './tools/worker.js';
import {
  handleProjectCreate,
  handleProjectList,
  handleProjectGet,
} from './tools/project.js';
import {
  handleTaskCreate,
  handleTaskList,
  handleTaskGet,
  handleTaskUpdate,
} from './tools/task.js';

/**
 * MCP Tool definitions
 */
const TOOLS: Tool[] = [
  // Worker tools
  {
    name: 'oct_worker_create',
    description: 'Create a new worker (human or agent)',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Worker name (1-256 characters)',
        },
        type: {
          type: 'string',
          enum: ['human', 'agent'],
          description: 'Type of worker',
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional roles for the worker',
          default: [],
        },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'oct_worker_list',
    description: 'List all workers with optional type filter',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['human', 'agent'],
          description: 'Filter by worker type',
        },
      },
    },
  },
  {
    name: 'oct_worker_get',
    description: 'Get worker by ID',
    inputSchema: {
      type: 'object',
      properties: {
        workerId: {
          type: 'string',
          description: 'The worker ID',
        },
      },
      required: ['workerId'],
    },
  },
  {
    name: 'oct_worker_delete',
    description: 'Delete worker by ID',
    inputSchema: {
      type: 'object',
      properties: {
        workerId: {
          type: 'string',
          description: 'The worker ID to delete',
        },
      },
      required: ['workerId'],
    },
  },
  // Project tools
  {
    name: 'oct_project_create',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name (1-256 characters)',
        },
        description: {
          type: 'string',
          description: 'Optional project description',
        },
        parentId: {
          type: 'string',
          description: 'Optional parent project ID for sub-projects',
        },
        memberIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Worker IDs who can work on this project',
          default: [],
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'oct_project_list',
    description: 'List all projects with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'archived'],
          description: 'Filter by project status',
        },
        parentId: {
          type: 'string',
          description: 'Filter by parent project ID',
        },
      },
    },
  },
  {
    name: 'oct_project_get',
    description: 'Get project by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The project ID',
        },
      },
      required: ['projectId'],
    },
  },
  // Task tools
  {
    name: 'oct_task_create',
    description: 'Create a new task with dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project ID to create the task in',
        },
        title: {
          type: 'string',
          description: 'Task title (1-256 characters)',
        },
        description: {
          type: 'string',
          description: 'Optional task description',
        },
        ownerId: {
          type: 'string',
          description: 'Worker ID who owns this task',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 4,
          description: 'Task priority (1=highest, 4=lowest)',
          default: 2,
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Task IDs that must be completed first',
          default: [],
        },
      },
      required: ['projectId', 'title', 'ownerId'],
    },
  },
  {
    name: 'oct_task_list',
    description: 'List tasks with filters',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        ownerId: {
          type: 'string',
          description: 'Filter by task owner',
        },
        status: {
          type: 'string',
          enum: ['backlog', 'ready', 'active', 'blocked', 'review', 'done'],
          description: 'Filter by task status',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 4,
          description: 'Filter by priority',
        },
      },
    },
  },
  {
    name: 'oct_task_get',
    description: 'Get task by ID',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The task ID',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'oct_task_update',
    description: 'Update task status, assignee, priority, title, or description',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The task ID to update',
        },
        status: {
          type: 'string',
          enum: ['backlog', 'ready', 'active', 'blocked', 'review', 'done'],
          description: 'New task status',
        },
        ownerId: {
          type: 'string',
          description: 'New task owner (worker ID)',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 4,
          description: 'New priority (1=highest, 4=lowest)',
        },
        title: {
          type: 'string',
          description: 'New task title',
        },
        description: {
          type: 'string',
          description: 'New task description',
        },
      },
      required: ['taskId'],
    },
  },
];

/**
 * Create and configure the MCP server
 */
export function createMcpServer(adapter: StorageAdapter): Server {
  const server = new Server(
    {
      name: 'oct-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      // Worker tools
      case 'oct_worker_create':
        return handleWorkerCreate(args as Record<string, unknown>, adapter);
      case 'oct_worker_list':
        return handleWorkerList(args as Record<string, unknown>, adapter);
      case 'oct_worker_get':
        return handleWorkerGet(args as Record<string, unknown>, adapter);
      case 'oct_worker_delete':
        return handleWorkerDelete(args as Record<string, unknown>, adapter);

      // Project tools
      case 'oct_project_create':
        return handleProjectCreate(args as Record<string, unknown>, adapter);
      case 'oct_project_list':
        return handleProjectList(args as Record<string, unknown>, adapter);
      case 'oct_project_get':
        return handleProjectGet(args as Record<string, unknown>, adapter);

      // Task tools
      case 'oct_task_create':
        return handleTaskCreate(args as Record<string, unknown>, adapter);
      case 'oct_task_list':
        return handleTaskList(args as Record<string, unknown>, adapter);
      case 'oct_task_get':
        return handleTaskGet(args as Record<string, unknown>, adapter);
      case 'oct_task_update':
        return handleTaskUpdate(args as Record<string, unknown>, adapter);

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'UNKNOWN_TOOL', message: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMcpServer(adapter: StorageAdapter): Promise<void> {
  const server = createMcpServer(adapter);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr (stdout is used for MCP communication)
  console.error('OCT MCP server running on stdio');
}
