// Playlist Manager - Manages playlist display and CRUD operations

export class PlaylistManager {
  constructor(soundLibrary, audioManager, onOpenBuilder) {
    this.soundLibrary = soundLibrary;
    this.audioManager = audioManager;
    this.onOpenBuilder = onOpenBuilder; // Callback to open PlaylistBuilder

    this.playlistsGrid = document.getElementById('playlistsGrid');
    this.playlistsCount = document.getElementById('playlistsCount');
    this.createPlaylistBtn = document.getElementById('createPlaylistBtn');
    this.playlistModal = document.getElementById('playlistModal');
    this.closeModalBtn = document.getElementById('closePlaylistModalBtn');
    this.newPlaylistName = document.getElementById('newPlaylistName');
    this.newPlaylistLoop = document.getElementById('newPlaylistLoop');
    this.createPlaylistSubmitBtn = document.getElementById('createPlaylistSubmitBtn');

    this.playlists = [];

    this.init();
  }

  async init() {
    await this.loadPlaylists();
    this.setupEventListeners();
  }

  async loadPlaylists() {
    try {
      this.playlists = await this.soundLibrary.getAllPlaylists();
      this.renderPlaylists();
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  }

  setupEventListeners() {
    // Create playlist button
    this.createPlaylistBtn.addEventListener('click', () => {
      this.openCreateModal();
    });

    // Close modal
    this.closeModalBtn.addEventListener('click', () => {
      this.closeCreateModal();
    });

    // Close modal on background click
    this.playlistModal.addEventListener('click', (e) => {
      if (e.target === this.playlistModal) {
        this.closeCreateModal();
      }
    });

    // Create playlist submit
    this.createPlaylistSubmitBtn.addEventListener('click', () => {
      this.handleCreatePlaylist();
    });

    // Enter key in new playlist input
    this.newPlaylistName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleCreatePlaylist();
      }
    });
  }

  renderPlaylists() {
    this.playlistsGrid.innerHTML = '';

    if (this.playlists.length === 0) {
      this.playlistsGrid.innerHTML = `
        <div class="col-span-full text-center text-gray-500 py-8">
          No playlists yet. Click "Create Playlist" to get started!
        </div>
      `;
      this.playlistsCount.textContent = '(0)';
      return;
    }

    this.playlistsCount.textContent = `(${this.playlists.length})`;

    this.playlists.forEach(playlist => {
      const card = this.createPlaylistCard(playlist);
      this.playlistsGrid.appendChild(card);
    });
  }

  createPlaylistCard(playlist) {
    const card = document.createElement('div');
    card.className = 'sound-card playlist-card';
    card.dataset.playlistId = playlist.id;

    const trackCount = playlist.tracks ? playlist.tracks.length : 0;
    const isCurrentlyPlaying = this.audioManager.isPlaylistPlaying() &&
      this.audioManager.getCurrentPlaylistState()?.playlistId === playlist.id;

    card.innerHTML = `
      <div class="sound-emoji">📋</div>
      <div class="sound-name">${this.escapeHtml(playlist.name)}</div>
      <div class="text-xs text-gray-500">${trackCount} track${trackCount !== 1 ? 's' : ''}</div>
      <div class="sound-buttons">
        <button class="btn btn-primary play-btn" title="Play Playlist">
          ${isCurrentlyPlaying ? '⏸️' : '▶️'}
        </button>
        <button class="btn btn-secondary stop-btn" title="Stop Playlist">⏹️</button>
        <button class="btn btn-secondary loop-btn ${playlist.loop ? 'active' : ''}" title="Toggle Loop">🔁</button>
        <button class="btn btn-secondary edit-btn" title="Edit Playlist">✏️</button>
        <button class="btn btn-danger delete-btn" title="Delete Playlist">🗑️</button>
      </div>
    `;

    // Event listeners
    const playBtn = card.querySelector('.play-btn');
    const stopBtn = card.querySelector('.stop-btn');
    const loopBtn = card.querySelector('.loop-btn');
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    playBtn.addEventListener('click', () => this.handlePlayToggle(playlist.id, playBtn));
    stopBtn.addEventListener('click', () => this.handleStop(playlist.id));
    loopBtn.addEventListener('click', () => this.handleToggleLoop(playlist.id));
    editBtn.addEventListener('click', () => this.handleEdit(playlist.id));
    deleteBtn.addEventListener('click', () => this.handleDelete(playlist.id));

    return card;
  }

  async handlePlayToggle(playlistId, playBtn) {
    try {
      const currentState = this.audioManager.getCurrentPlaylistState();

      if (currentState && currentState.playlistId === playlistId) {
        // This playlist is already playing - toggle pause/resume
        if (currentState.isPlaying) {
          this.audioManager.pausePlaylist();
          playBtn.innerHTML = '▶️';
        } else {
          await this.audioManager.resumePlaylist();
          playBtn.innerHTML = '⏸️';
        }
      } else {
        // Start playing this playlist
        await this.audioManager.playPlaylist(playlistId);
        playBtn.innerHTML = '⏸️';

        // Update all other playlist cards to show play button
        this.updateAllPlayButtons();
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
      alert(`Failed to play playlist: ${error.message}`);
    }
  }

  handleStop(playlistId) {
    const currentState = this.audioManager.getCurrentPlaylistState();

    if (currentState && currentState.playlistId === playlistId) {
      this.audioManager.stopPlaylist();
      this.updateAllPlayButtons();
    }
  }

  async handleToggleLoop(playlistId) {
    try {
      const playlist = this.playlists.find(p => p.id === playlistId);
      if (!playlist) return;

      const newLoopState = !playlist.loop;
      await this.soundLibrary.updatePlaylist(playlistId, { loop: newLoopState });

      playlist.loop = newLoopState;

      // Update the button
      const card = this.playlistsGrid.querySelector(`[data-playlist-id="${playlistId}"]`);
      if (card) {
        const loopBtn = card.querySelector('.loop-btn');
        loopBtn.classList.toggle('active', newLoopState);
      }

      // If this playlist is currently playing, update the playlist state
      if (this.audioManager.isPlaylistPlaying()) {
        const currentState = this.audioManager.getCurrentPlaylistState();
        if (currentState && currentState.playlistId === playlistId) {
          this.audioManager.currentPlaylist.playlist.loop = newLoopState;
        }
      }
    } catch (error) {
      console.error('Error toggling loop:', error);
      alert(`Failed to toggle loop: ${error.message}`);
    }
  }

  handleEdit(playlistId) {
    if (this.onOpenBuilder) {
      this.onOpenBuilder(playlistId);
    }
  }

  async handleDelete(playlistId) {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const confirmDelete = confirm(`Delete playlist "${playlist.name}"? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      // Stop playlist if currently playing
      const currentState = this.audioManager.getCurrentPlaylistState();
      if (currentState && currentState.playlistId === playlistId) {
        this.audioManager.stopPlaylist();
      }

      await this.soundLibrary.deletePlaylist(playlistId);

      this.playlists = this.playlists.filter(p => p.id !== playlistId);
      this.renderPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert(`Failed to delete playlist: ${error.message}`);
    }
  }

  openCreateModal() {
    this.newPlaylistName.value = '';
    this.newPlaylistLoop.checked = false;
    this.playlistModal.classList.remove('hidden');
    this.newPlaylistName.focus();
  }

  closeCreateModal() {
    this.playlistModal.classList.add('hidden');
  }

  async handleCreatePlaylist() {
    const name = this.newPlaylistName.value.trim();

    if (!name) {
      alert('Please enter a playlist name');
      return;
    }

    try {
      const playlist = await this.soundLibrary.createPlaylist(name, this.newPlaylistLoop.checked);

      // Add tracks property for display
      playlist.tracks = [];

      this.playlists.push(playlist);
      this.playlists.sort((a, b) => a.name.localeCompare(b.name));

      this.renderPlaylists();
      this.closeCreateModal();

      // Optionally open builder to add tracks
      if (confirm(`Playlist "${name}" created! Would you like to add tracks now?`)) {
        this.handleEdit(playlist.id);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert(`Failed to create playlist: ${error.message}`);
    }
  }

  updateAllPlayButtons() {
    const currentState = this.audioManager.getCurrentPlaylistState();

    this.playlistsGrid.querySelectorAll('.playlist-card').forEach(card => {
      const playBtn = card.querySelector('.play-btn');
      const playlistId = card.dataset.playlistId;

      if (currentState && currentState.playlistId === playlistId && currentState.isPlaying) {
        playBtn.innerHTML = '⏸️';
      } else {
        playBtn.innerHTML = '▶️';
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async refresh() {
    await this.loadPlaylists();
  }
}
