// Rename Manager - Handles sound renaming UI and logic

export class RenameManager {
  constructor(soundLibrary, onRenameComplete) {
    this.soundLibrary = soundLibrary;
    this.onRenameComplete = onRenameComplete;
    this.currentSoundId = null;

    this.modal = document.getElementById('renameModal');
    this.closeBtn = document.getElementById('closeRenameModalBtn');
    this.renameInput = document.getElementById('renameInput');
    this.confirmBtn = document.getElementById('confirmRenameBtn');
    this.errorDiv = document.getElementById('renameError');

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

    // Confirm rename
    this.confirmBtn.addEventListener('click', () => {
      this.handleRename();
    });

    // Enter key to confirm
    this.renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleRename();
      } else if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.closeModal();
      }
    });
  }

  openModal(soundId, currentName) {
    this.currentSoundId = soundId;
    this.renameInput.value = currentName;
    this.hideError();
    this.modal.classList.remove('hidden');

    // Focus and select text
    setTimeout(() => {
      this.renameInput.focus();
      this.renameInput.select();
    }, 100);
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.currentSoundId = null;
    this.renameInput.value = '';
    this.hideError();
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.classList.remove('hidden');
  }

  hideError() {
    this.errorDiv.classList.add('hidden');
  }

  async handleRename() {
    this.hideError();

    const newName = this.renameInput.value.trim();

    // Validate
    if (!newName) {
      this.showError('Please enter a name');
      return;
    }

    if (!this.currentSoundId) {
      this.showError('No sound selected');
      return;
    }

    // Disable button while renaming
    this.confirmBtn.disabled = true;
    this.confirmBtn.textContent = 'Renaming...';

    try {
      await this.soundLibrary.updateSound(this.currentSoundId, { name: newName });

      // Notify completion
      if (this.onRenameComplete) {
        this.onRenameComplete(this.currentSoundId, newName);
      }

      this.closeModal();
    } catch (error) {
      console.error('Rename error:', error);
      this.showError(`Failed to rename: ${error.message}`);
    } finally {
      this.confirmBtn.disabled = false;
      this.confirmBtn.textContent = 'Rename Sound';
    }
  }
}
