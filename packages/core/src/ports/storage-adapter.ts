import type { Project } from '../schemas/project.js';
import type { Employee } from '../schemas/employee.js';
import type { EmployeeTemplate } from '../schemas/template.js';
import type { Task } from '../schemas/task.js';
import type { DomainError } from '../schemas/error.js';
import type { Result } from 'neverthrow';

export interface StorageAdapter {
  // Projects
  getProject(id: string): Promise<Result<Project | null, DomainError>>;
  saveProject(project: Project): Promise<Result<void, DomainError>>;
  deleteProject(id: string): Promise<Result<void, DomainError>>;
  listProjects(filter?: { parentId?: string | null; status?: string }): Promise<Result<Project[], DomainError>>;

  // Employees
  getEmployee(id: string): Promise<Result<Employee | null, DomainError>>;
  saveEmployee(employee: Employee): Promise<Result<void, DomainError>>;
  deleteEmployee(id: string): Promise<Result<void, DomainError>>;
  listEmployees(filter?: { kind?: string; templateId?: string }): Promise<Result<Employee[], DomainError>>;

  // Templates
  getTemplate(id: string): Promise<Result<EmployeeTemplate | null, DomainError>>;
  saveTemplate(template: EmployeeTemplate): Promise<Result<void, DomainError>>;
  deleteTemplate(id: string): Promise<Result<void, DomainError>>;
  listTemplates(): Promise<Result<EmployeeTemplate[], DomainError>>;

  // Tasks
  getTask(id: string): Promise<Result<Task | null, DomainError>>;
  saveTask(task: Task): Promise<Result<void, DomainError>>;
  deleteTask(id: string): Promise<Result<void, DomainError>>;
  listTasks(filter?: { projectId?: string; ownerId?: string; status?: string; priority?: string }): Promise<Result<Task[], DomainError>>;

  // Queries
  getTasksByProject(projectId: string): Promise<Result<Task[], DomainError>>;
  getSubProjects(parentId: string): Promise<Result<Project[], DomainError>>;
  getTasksByOwner(employeeId: string): Promise<Result<Task[], DomainError>>;
  getTasksByDependency(taskId: string): Promise<Result<Task[], DomainError>>;
}
