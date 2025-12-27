// Upload Manager - Handles file upload UI and logic

import { CATEGORIES, SUPPORTED_AUDIO_FORMATS, MAX_FILE_SIZE } from '../utils/constants.js';
import { formatFileSize } from '../utils/helpers.js';

export class UploadManager {
  constructor(soundLibrary, onUploadComplete) {
    this.soundLibrary = soundLibrary;
    this.onUploadComplete = onUploadComplete;

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

    this.selectedCategory = CATEGORIES.SFX;

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
      // Auto-populate name from filename
      if (this.fileInput.files.length > 0 && !this.nameInput.value) {
        const filename = this.fileInput.files[0].name;
        this.nameInput.value = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      }
    });

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

  openModal() {
    this.modal.classList.remove('hidden');
    this.resetForm();
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.resetForm();
  }

  resetForm() {
    this.fileInput.value = '';
    this.nameInput.value = '';
    this.emojiInput.value = '';
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

      this.uploadProgressBar.style.width = '60%';

      const sound = await this.soundLibrary.addSound(file, this.selectedCategory, options);

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
