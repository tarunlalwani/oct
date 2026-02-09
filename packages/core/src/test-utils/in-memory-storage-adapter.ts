import { ok, type Result } from 'neverthrow';
import type {
  StorageAdapter,
  Project,
  Employee,
  EmployeeTemplate,
  Task,
  DomainError,
} from '../index.js';

export class InMemoryStorageAdapter implements StorageAdapter {
  private projects: Map<string, Project> = new Map();
  private employees: Map<string, Employee> = new Map();
  private templates: Map<string, EmployeeTemplate> = new Map();
  private tasks: Map<string, Task> = new Map();

  // Projects
  async getProject(id: string): Promise<Result<Project | null, DomainError>> {
    return ok(this.projects.get(id) ?? null);
  }

  async saveProject(project: Project): Promise<Result<void, DomainError>> {
    this.projects.set(project.projectId, { ...project });
    return ok(undefined);
  }

  async deleteProject(id: string): Promise<Result<void, DomainError>> {
    this.projects.delete(id);
    return ok(undefined);
  }

  async listProjects(filter?: { parentId?: string | null; status?: string }): Promise<Result<Project[], DomainError>> {
    let projects = Array.from(this.projects.values());

    if (filter?.parentId !== undefined) {
      projects = projects.filter(p => p.parentId === filter.parentId);
    }

    if (filter?.status !== undefined) {
      projects = projects.filter(p => p.status === filter.status);
    }

    return ok(projects);
  }

  // Employees
  async getEmployee(id: string): Promise<Result<Employee | null, DomainError>> {
    return ok(this.employees.get(id) ?? null);
  }

  async saveEmployee(employee: Employee): Promise<Result<void, DomainError>> {
    this.employees.set(employee.employeeId, { ...employee });
    return ok(undefined);
  }

  async deleteEmployee(id: string): Promise<Result<void, DomainError>> {
    this.employees.delete(id);
    return ok(undefined);
  }

  async listEmployees(filter?: { kind?: string; templateId?: string }): Promise<Result<Employee[], DomainError>> {
    let employees = Array.from(this.employees.values());

    if (filter?.kind !== undefined) {
      employees = employees.filter(e => e.kind === filter.kind);
    }

    if (filter?.templateId !== undefined) {
      employees = employees.filter(e => e.templateId === filter.templateId);
    }

    return ok(employees);
  }

  // Templates
  async getTemplate(id: string): Promise<Result<EmployeeTemplate | null, DomainError>> {
    return ok(this.templates.get(id) ?? null);
  }

  async saveTemplate(template: EmployeeTemplate): Promise<Result<void, DomainError>> {
    this.templates.set(template.templateId, { ...template });
    return ok(undefined);
  }

  async deleteTemplate(id: string): Promise<Result<void, DomainError>> {
    this.templates.delete(id);
    return ok(undefined);
  }

  async listTemplates(): Promise<Result<EmployeeTemplate[], DomainError>> {
    return ok(Array.from(this.templates.values()));
  }

  // Tasks
  async getTask(id: string): Promise<Result<Task | null, DomainError>> {
    return ok(this.tasks.get(id) ?? null);
  }

  async saveTask(task: Task): Promise<Result<void, DomainError>> {
    this.tasks.set(task.taskId, { ...task });
    return ok(undefined);
  }

  async deleteTask(id: string): Promise<Result<void, DomainError>> {
    this.tasks.delete(id);
    return ok(undefined);
  }

  async listTasks(filter?: { projectId?: string; ownerId?: string; status?: string; priority?: string }): Promise<Result<Task[], DomainError>> {
    let tasks = Array.from(this.tasks.values());

    if (filter?.projectId !== undefined) {
      tasks = tasks.filter(t => t.projectId === filter.projectId);
    }

    if (filter?.ownerId !== undefined) {
      tasks = tasks.filter(t => t.ownerId === filter.ownerId);
    }

    if (filter?.status !== undefined) {
      tasks = tasks.filter(t => t.status === filter.status);
    }

    if (filter?.priority !== undefined) {
      tasks = tasks.filter(t => t.priority === filter.priority);
    }

    return ok(tasks);
  }

  // Queries
  async getTasksByProject(projectId: string): Promise<Result<Task[], DomainError>> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
    return ok(tasks);
  }

  async getSubProjects(parentId: string): Promise<Result<Project[], DomainError>> {
    const projects = Array.from(this.projects.values()).filter(p => p.parentId === parentId);
    return ok(projects);
  }

  async getTasksByOwner(employeeId: string): Promise<Result<Task[], DomainError>> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.ownerId === employeeId);
    return ok(tasks);
  }

  async getTasksByDependency(taskId: string): Promise<Result<Task[], DomainError>> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.dependencies.includes(taskId));
    return ok(tasks);
  }

  // Helper methods for testing
  clear(): void {
    this.projects.clear();
    this.employees.clear();
    this.templates.clear();
    this.tasks.clear();
  }

  seedProject(project: Project): void {
    this.projects.set(project.projectId, project);
  }

  seedEmployee(employee: Employee): void {
    this.employees.set(employee.employeeId, employee);
  }

  seedTemplate(template: EmployeeTemplate): void {
    this.templates.set(template.templateId, template);
  }

  seedTask(task: Task): void {
    this.tasks.set(task.taskId, task);
  }
}
