// Project Manager - Manages project selection and CRUD operations

import { ALL_PROJECTS, DEFAULT_PROJECT_ID } from '../utils/constants.js';

export class ProjectManager {
  constructor(soundLibrary, onProjectChanged) {
    this.soundLibrary = soundLibrary;
    this.onProjectChanged = onProjectChanged;

    this.projectDropdown = document.getElementById('projectDropdown');
    this.manageBtn = document.getElementById('manageProjectsBtn');
    this.projectModal = document.getElementById('projectModal');
    this.closeModalBtn = document.getElementById('closeProjectModalBtn');
    this.projectList = document.getElementById('projectList');
    this.newProjectName = document.getElementById('newProjectName');
    this.createProjectBtn = document.getElementById('createProjectBtn');

    this.currentProjectId = ALL_PROJECTS;
    this.projects = [];

    this.init();
  }

  async init() {
    await this.loadProjects();
    this.setupEventListeners();

    // Load saved project from localStorage
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId) {
      this.currentProjectId = savedProjectId;
      this.projectDropdown.value = savedProjectId;
    }
  }

  async loadProjects() {
    try {
      this.projects = await this.soundLibrary.getAllProjects();
      this.renderProjectDropdown();
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  renderProjectDropdown() {
    // Clear existing options except "All Projects"
    this.projectDropdown.innerHTML = `
      <option value="${ALL_PROJECTS}">All Projects</option>
    `;

    // Add user projects
    this.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      this.projectDropdown.appendChild(option);
    });

    // Set current selection
    this.projectDropdown.value = this.currentProjectId;
  }

  setupEventListeners() {
    // Dropdown change
    this.projectDropdown.addEventListener('change', () => {
      this.handleProjectChange();
    });

    // Manage button
    this.manageBtn.addEventListener('click', () => {
      this.openProjectModal();
    });

    // Close modal
    this.closeModalBtn.addEventListener('click', () => {
      this.closeProjectModal();
    });

    // Close modal on background click
    this.projectModal.addEventListener('click', (e) => {
      if (e.target === this.projectModal) {
        this.closeProjectModal();
      }
    });

    // Create project
    this.createProjectBtn.addEventListener('click', () => {
      this.handleCreateProject();
    });

    // Enter key in new project input
    this.newProjectName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleCreateProject();
      }
    });
  }

  async handleProjectChange() {
    const newProjectId = this.projectDropdown.value;

    if (newProjectId !== this.currentProjectId) {
      this.currentProjectId = newProjectId;

      // Save to localStorage
      localStorage.setItem('currentProjectId', newProjectId);

      // Notify listeners
      if (this.onProjectChanged) {
        this.onProjectChanged(newProjectId);
      }
    }
  }

  async openProjectModal() {
    await this.renderProjectList();
    this.projectModal.classList.remove('hidden');
  }

  closeProjectModal() {
    this.projectModal.classList.add('hidden');
    this.newProjectName.value = '';
  }

  async renderProjectList() {
    this.projectList.innerHTML = '';

    for (const project of this.projects) {
      const li = document.createElement('li');
      li.className = 'project-list-item';
      li.innerHTML = `
        <input type="text" class="project-name-input" value="${project.name}" data-project-id="${project.id}">
        <button class="btn-icon btn-rename" data-project-id="${project.id}" title="Rename">✏️</button>
        <button class="btn-icon btn-delete ${this.projects.length <= 1 ? 'disabled' : ''}"
                data-project-id="${project.id}"
                title="${this.projects.length <= 1 ? 'Cannot delete last project' : 'Delete'}"
                ${this.projects.length <= 1 ? 'disabled' : ''}>🗑️</button>
      `;

      this.projectList.appendChild(li);

      // Add event listeners
      const nameInput = li.querySelector('.project-name-input');
      const renameBtn = li.querySelector('.btn-rename');
      const deleteBtn = li.querySelector('.btn-delete');

      nameInput.addEventListener('change', () => this.handleRenameProject(project.id, nameInput.value));
      renameBtn.addEventListener('click', () => nameInput.focus());
      deleteBtn.addEventListener('click', () => this.handleDeleteProject(project.id));
    }
  }

  async handleCreateProject() {
    const name = this.newProjectName.value.trim();

    if (!name) {
      alert('Please enter a project name');
      return;
    }

    try {
      const project = await this.soundLibrary.createProject(name);
      this.projects.push(project);
      this.projects.sort((a, b) => a.name.localeCompare(b.name));

      this.newProjectName.value = '';
      this.renderProjectDropdown();
      await this.renderProjectList();
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error.message}`);
    }
  }

  async handleRenameProject(projectId, newName) {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      alert('Project name cannot be empty');
      await this.renderProjectList();
      return;
    }

    try {
      await this.soundLibrary.updateProject(projectId, { name: trimmedName });

      const project = this.projects.find(p => p.id === projectId);
      if (project) {
        project.name = trimmedName;
        this.projects.sort((a, b) => a.name.localeCompare(b.name));
      }

      this.renderProjectDropdown();
      await this.renderProjectList();
    } catch (error) {
      console.error('Error renaming project:', error);
      alert(`Failed to rename project: ${error.message}`);
      await this.renderProjectList();
    }
  }

  async handleDeleteProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);

    if (!project) return;

    if (this.projects.length <= 1) {
      alert('Cannot delete the last project');
      return;
    }

    const confirmDelete = confirm(`Delete project "${project.name}"? Sounds won't be deleted, just unassigned from this project.`);

    if (!confirmDelete) return;

    try {
      await this.soundLibrary.deleteProject(projectId);

      this.projects = this.projects.filter(p => p.id !== projectId);

      // If deleted project was selected, switch to All Projects
      if (this.currentProjectId === projectId) {
        this.currentProjectId = ALL_PROJECTS;
        localStorage.setItem('currentProjectId', ALL_PROJECTS);

        if (this.onProjectChanged) {
          this.onProjectChanged(ALL_PROJECTS);
        }
      }

      this.renderProjectDropdown();
      await this.renderProjectList();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert(`Failed to delete project: ${error.message}`);
    }
  }

  getCurrentProjectId() {
    return this.currentProjectId;
  }

  async refresh() {
    await this.loadProjects();
  }
}
