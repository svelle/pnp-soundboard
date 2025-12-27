// Upload Manager - Handles file upload UI and logic

import { CATEGORIES, SUPPORTED_AUDIO_FORMATS, MAX_FILE_SIZE } from '../utils/constants.js';
import { formatFileSize } from '../utils/helpers.js';

export class UploadManager {
  constructor(soundLibrary, onUploadComplete, mode = 'local', projectManager = null) {
    this.soundLibrary = soundLibrary;
    this.onUploadComplete = onUploadComplete;
    this.mode = mode;
    this.projectManager = projectManager;

    this.modal = document.getElementById('uploadModal');
    this.uploadBtn = document.getElementById('uploadBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.fileInput = document.getElementById('fileInput');
    this.nameInput = document.getElementById('nameInput');
    this.emojiInput = document.getElementById('emojiInput');
    this.confirmUploadBtn = document.getElementById('confirmUploadBtn');
    this.uploadProgress = document.getElementById('uploadProgress');
    this.uploadProgressBar = document.getElementById('uploadProgressBar');
    this.uploadError = document.getElementById('uploadError');
    this.dropZone = document.getElementById('dropZone');
    this.selectedFileName = document.getElementById('selectedFileName');
    this.uploadProjectSelection = document.getElementById('uploadProjectSelection');

    this.selectedCategory = CATEGORIES.SFX;
    this.authConfigured = false;

    this.init();
  }

  init() {
    // Open modal
    this.uploadBtn.addEventListener('click', () => {
      this.openModal();
    });

    // Close modal
    this.closeModalBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // Close modal on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Category selection
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedCategory = btn.dataset.category;

        // Update emoji placeholder based on category
        const emojiMap = {
          [CATEGORIES.SFX]: '🔊',
          [CATEGORIES.MUSIC]: '🎵',
          [CATEGORIES.AMBIENCE]: '🌊'
        };
        this.emojiInput.placeholder = emojiMap[this.selectedCategory];
      });
    });

    // Set default category
    document.querySelector(`[data-category="${CATEGORIES.SFX}"]`).classList.add('selected');

    // File input change
    this.fileInput.addEventListener('change', () => {
      this.handleFileSelect();
    });

    // Drag and drop events
    this.setupDragAndDrop();

    // Confirm upload
    this.confirmUploadBtn.addEventListener('click', () => {
      this.handleUpload();
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.closeModal();
      }
    });
  }

  async openModal() {
    this.modal.classList.remove('hidden');
    this.resetForm();
    await this.renderProjectCheckboxes();
  }

  async renderProjectCheckboxes() {
    if (!this.projectManager) {
      this.uploadProjectSelection.innerHTML = '<p class="text-sm text-gray-400">Projects not available</p>';
      return;
    }

    try {
      const projects = await this.soundLibrary.getAllProjects();
      const currentProjectId = this.projectManager.getCurrentProjectId();

      this.uploadProjectSelection.innerHTML = '';

      if (projects.length === 0) {
        this.uploadProjectSelection.innerHTML = '<p class="text-sm text-gray-400">No projects yet. Create one first!</p>';
        return;
      }

      projects.forEach(project => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer hover:bg-gray-600 p-2 rounded transition';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = project.id;
        checkbox.className = 'w-4 h-4 cursor-pointer';

        // Pre-select current project if it's not "All Projects"
        if (currentProjectId !== 'ALL_PROJECTS' && project.id === currentProjectId) {
          checkbox.checked = true;
        }

        const text = document.createElement('span');
        text.className = 'text-sm';
        text.textContent = project.name;

        label.appendChild(checkbox);
        label.appendChild(text);
        this.uploadProjectSelection.appendChild(label);
      });
    } catch (error) {
      console.error('Error rendering project checkboxes:', error);
      this.uploadProjectSelection.innerHTML = '<p class="text-sm text-red-400">Error loading projects</p>';
    }
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.resetForm();
  }

  resetForm() {
    this.fileInput.value = '';
    this.nameInput.value = '';
    this.emojiInput.value = '';
    this.selectedFileName.classList.add('hidden');
    this.uploadProgress.classList.add('hidden');
    this.uploadError.classList.add('hidden');
    this.uploadProgressBar.style.width = '0%';
  }

  showError(message) {
    this.uploadError.textContent = message;
    this.uploadError.classList.remove('hidden');
  }

  hideError() {
    this.uploadError.classList.add('hidden');
  }

  setupDragAndDrop() {
    // Prevent default drag behaviors on the entire document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => {
        this.dropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => {
        this.dropZone.classList.remove('drag-over');
      }, false);
    });

    // Handle dropped files
    this.dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // Use DataTransfer to set files on the hidden input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(files[0]);
        this.fileInput.files = dataTransfer.files;

        // Trigger file select handler
        this.handleFileSelect();
      }
    }, false);

    // Make the drop zone clickable to trigger file input
    this.dropZone.addEventListener('click', (e) => {
      // Don't trigger if clicking the label (which already triggers the input)
      if (e.target.tagName !== 'LABEL') {
        this.fileInput.click();
      }
    });
  }

  handleFileSelect() {
    // Auto-populate name from filename and show selected file
    if (this.fileInput.files.length > 0) {
      const filename = this.fileInput.files[0].name;

      // Auto-populate name if empty
      if (!this.nameInput.value) {
        this.nameInput.value = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      }

      // Show selected filename
      this.selectedFileName.textContent = `Selected: ${filename}`;
      this.selectedFileName.classList.remove('hidden');
    } else {
      this.selectedFileName.classList.add('hidden');
    }
  }

  async handleUpload() {
    this.hideError();

    // Validate file selection
    if (this.fileInput.files.length === 0) {
      this.showError('Please select an audio file');
      return;
    }

    const file = this.fileInput.files[0];

    // Validate file type
    if (!SUPPORTED_AUDIO_FORMATS.includes(file.type)) {
      this.showError('Unsupported file format. Please use MP3, WAV, or OGG.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      this.showError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }

    // Show progress
    this.uploadProgress.classList.remove('hidden');
    this.confirmUploadBtn.disabled = true;
    this.confirmUploadBtn.innerHTML = '<span class="spinner"></span> Uploading...';

    try {
      // Simulate progress
      this.uploadProgressBar.style.width = '30%';

      // Upload sound
      const options = {};
      if (this.nameInput.value.trim()) {
        options.name = this.nameInput.value.trim();
      }
      if (this.emojiInput.value.trim()) {
        options.emoji = this.emojiInput.value.trim();
      }

      // Get selected projects
      const selectedProjectIds = [];
      if (this.projectManager) {
        const checkboxes = this.uploadProjectSelection.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(cb => selectedProjectIds.push(cb.value));
      }

      this.uploadProgressBar.style.width = '60%';

      const sound = await this.soundLibrary.addSound(file, this.selectedCategory, options);

      this.uploadProgressBar.style.width = '80%';

      // Add sound to selected projects
      if (selectedProjectIds.length > 0) {
        for (const projectId of selectedProjectIds) {
          try {
            await this.soundLibrary.addSoundToProject(projectId, sound.id);
          } catch (error) {
            console.error(`Error adding sound to project ${projectId}:`, error);
          }
        }
      }

      this.uploadProgressBar.style.width = '100%';

      // Notify completion
      if (this.onUploadComplete) {
        this.onUploadComplete(sound);
      }

      // Close modal after short delay
      setTimeout(() => {
        this.closeModal();
      }, 300);

    } catch (error) {
      console.error('Upload error:', error);
      this.showError(`Upload failed: ${error.message}`);
      this.uploadProgress.classList.add('hidden');
    } finally {
      this.confirmUploadBtn.disabled = false;
      this.confirmUploadBtn.textContent = 'Upload Sound';
    }
  }
}
