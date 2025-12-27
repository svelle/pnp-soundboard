// Project Assignment Manager - Handles assigning sounds to projects

export class ProjectAssignmentManager {
  constructor(soundLibrary, onAssignmentComplete) {
    this.soundLibrary = soundLibrary;
    this.onAssignmentComplete = onAssignmentComplete;
    this.currentSoundId = null;
    this.currentSoundName = null;
    this.initialProjectIds = new Set();

    this.modal = document.getElementById('assignProjectsModal');
    this.closeBtn = document.getElementById('closeAssignProjectsModalBtn');
    this.projectsList = document.getElementById('assignProjectsList');
    this.confirmBtn = document.getElementById('confirmAssignProjectsBtn');
    this.errorDiv = document.getElementById('assignProjectsError');

    this.init();
  }

  init() {
    // Close modal
    this.closeBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // Close modal on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Confirm assignment
    this.confirmBtn.addEventListener('click', () => {
      this.handleAssignment();
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.closeModal();
      }
    });
  }

  async openModal(soundId, soundName) {
    this.currentSoundId = soundId;
    this.currentSoundName = soundName;
    this.hideError();

    await this.renderProjects();

    this.modal.classList.remove('hidden');
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.currentSoundId = null;
    this.currentSoundName = null;
    this.initialProjectIds.clear();
    this.projectsList.innerHTML = '';
    this.hideError();
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.classList.remove('hidden');
  }

  hideError() {
    this.errorDiv.classList.add('hidden');
  }

  async renderProjects() {
    try {
      const projects = await this.soundLibrary.getAllProjects();

      if (projects.length === 0) {
        this.projectsList.innerHTML = '<p class="text-sm text-gray-400">No projects available. Create one first!</p>';
        return;
      }

      // Find which projects currently contain this sound
      this.initialProjectIds.clear();
      projects.forEach(project => {
        if (project.soundIds && project.soundIds.includes(this.currentSoundId)) {
          this.initialProjectIds.add(project.id);
        }
      });

      // Render checkboxes
      this.projectsList.innerHTML = '';
      projects.forEach(project => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer hover:bg-gray-600 p-2 rounded transition';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = project.id;
        checkbox.className = 'w-4 h-4 cursor-pointer';
        checkbox.checked = this.initialProjectIds.has(project.id);

        const text = document.createElement('span');
        text.className = 'text-sm';
        text.textContent = project.name;

        label.appendChild(checkbox);
        label.appendChild(text);
        this.projectsList.appendChild(label);
      });

    } catch (error) {
      console.error('Error rendering projects:', error);
      this.projectsList.innerHTML = '<p class="text-sm text-red-400">Error loading projects</p>';
    }
  }

  async handleAssignment() {
    this.hideError();

    if (!this.currentSoundId) {
      this.showError('No sound selected');
      return;
    }

    // Disable button while saving
    this.confirmBtn.disabled = true;
    this.confirmBtn.textContent = 'Saving...';

    try {
      // Get currently selected projects
      const checkboxes = this.projectsList.querySelectorAll('input[type="checkbox"]');
      const selectedProjectIds = new Set();

      checkboxes.forEach(cb => {
        if (cb.checked) {
          selectedProjectIds.add(cb.value);
        }
      });

      // Determine what changed
      const toAdd = [...selectedProjectIds].filter(id => !this.initialProjectIds.has(id));
      const toRemove = [...this.initialProjectIds].filter(id => !selectedProjectIds.has(id));

      // Add to new projects
      for (const projectId of toAdd) {
        await this.soundLibrary.addSoundToProject(projectId, this.currentSoundId);
      }

      // Remove from unchecked projects
      for (const projectId of toRemove) {
        await this.soundLibrary.removeSoundFromProject(projectId, this.currentSoundId);
      }

      // Notify completion
      if (this.onAssignmentComplete) {
        this.onAssignmentComplete(this.currentSoundId);
      }

      this.closeModal();
    } catch (error) {
      console.error('Assignment error:', error);
      this.showError(`Failed to update projects: ${error.message}`);
    } finally {
      this.confirmBtn.disabled = false;
      this.confirmBtn.textContent = 'Save Changes';
    }
  }
}
