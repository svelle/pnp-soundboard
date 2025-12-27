// Playlist Assignment Manager - Handles adding sounds to playlists

export class PlaylistAssignmentManager {
  constructor(soundLibrary, onAssignmentComplete) {
    this.soundLibrary = soundLibrary;
    this.onAssignmentComplete = onAssignmentComplete;
    this.currentSoundId = null;
    this.currentSoundName = null;

    this.modal = document.getElementById('addToPlaylistModal');
    this.closeBtn = document.getElementById('closeAddToPlaylistModalBtn');
    this.playlistsList = document.getElementById('addToPlaylistsList');
    this.confirmBtn = document.getElementById('confirmAddToPlaylistBtn');
    this.errorDiv = document.getElementById('addToPlaylistError');

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

    await this.renderPlaylists();

    this.modal.classList.remove('hidden');
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.currentSoundId = null;
    this.currentSoundName = null;
    this.playlistsList.innerHTML = '';
    this.hideError();
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.classList.remove('hidden');
  }

  hideError() {
    this.errorDiv.classList.add('hidden');
  }

  async renderPlaylists() {
    try {
      const playlists = await this.soundLibrary.getAllPlaylists();

      if (playlists.length === 0) {
        this.playlistsList.innerHTML = '<p class="text-sm text-gray-400">No playlists available. Create one first!</p>';
        this.confirmBtn.disabled = true;
        return;
      }

      this.confirmBtn.disabled = false;

      // Render checkboxes
      this.playlistsList.innerHTML = '';
      playlists.forEach(playlist => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer hover:bg-gray-600 p-2 rounded transition';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = playlist.id;
        checkbox.className = 'w-4 h-4 cursor-pointer';

        const text = document.createElement('span');
        text.className = 'text-sm';
        const trackCount = playlist.tracks ? playlist.tracks.length : 0;
        text.textContent = `${playlist.name} (${trackCount} tracks)`;

        label.appendChild(checkbox);
        label.appendChild(text);
        this.playlistsList.appendChild(label);
      });

    } catch (error) {
      console.error('Error rendering playlists:', error);
      this.playlistsList.innerHTML = '<p class="text-sm text-red-400">Error loading playlists</p>';
      this.confirmBtn.disabled = true;
    }
  }

  async handleAssignment() {
    this.hideError();

    if (!this.currentSoundId) {
      this.showError('No sound selected');
      return;
    }

    // Get selected playlists
    const checkboxes = this.playlistsList.querySelectorAll('input[type="checkbox"]:checked');

    if (checkboxes.length === 0) {
      this.showError('Please select at least one playlist');
      return;
    }

    // Disable button while saving
    this.confirmBtn.disabled = true;
    this.confirmBtn.textContent = 'Adding...';

    try {
      // Add sound as track to each selected playlist
      for (const checkbox of checkboxes) {
        const playlistId = checkbox.value;
        await this.soundLibrary.addTrackToPlaylist(playlistId, this.currentSoundId, {
          volume: 0.8,
          pauseMin: 0,
          pauseMax: 0
        });
      }

      // Notify completion
      if (this.onAssignmentComplete) {
        this.onAssignmentComplete(this.currentSoundId);
      }

      this.closeModal();
    } catch (error) {
      console.error('Assignment error:', error);
      this.showError(`Failed to add to playlists: ${error.message}`);
    } finally {
      this.confirmBtn.disabled = false;
      this.confirmBtn.textContent = 'Add to Selected Playlists';
    }
  }
}
