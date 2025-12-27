// Playlist Builder - Edit playlist contents (add/remove/reorder tracks)

export class PlaylistBuilder {
  constructor(soundLibrary) {
    this.soundLibrary = soundLibrary;

    this.builderModal = document.getElementById('playlistBuilderModal');
    this.closeBuilderBtn = document.getElementById('closePlaylistBuilderBtn');
    this.playlistNameHeader = document.getElementById('playlistNameHeader');
    this.playlistLoopToggle = document.getElementById('playlistLoopToggle');
    this.playlistTracksContainer = document.getElementById('playlistTracksContainer');
    this.addTrackSoundSelect = document.getElementById('addTrackSoundSelect');
    this.addTrackBtn = document.getElementById('addTrackBtn');
    this.savePlaylistBtn = document.getElementById('savePlaylistBtn');

    this.currentPlaylistId = null;
    this.currentPlaylist = null;
    this.allSounds = [];

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close modal
    this.closeBuilderBtn.addEventListener('click', () => {
      this.closeBuilder();
    });

    // Close modal on background click
    this.builderModal.addEventListener('click', (e) => {
      if (e.target === this.builderModal) {
        this.closeBuilder();
      }
    });

    // Loop toggle
    this.playlistLoopToggle.addEventListener('change', () => {
      this.handleLoopToggle();
    });

    // Add track button
    this.addTrackBtn.addEventListener('click', () => {
      this.handleAddTrack();
    });

    // Save button
    this.savePlaylistBtn.addEventListener('click', () => {
      this.closeBuilder();
    });
  }

  async openBuilder(playlistId) {
    try {
      this.currentPlaylistId = playlistId;

      // Load playlist with tracks
      this.currentPlaylist = await this.soundLibrary.getPlaylist(playlistId);

      // Load all sounds for the dropdown
      this.allSounds = await this.soundLibrary.getAllSounds();

      // Populate UI
      this.playlistNameHeader.textContent = this.currentPlaylist.name;
      this.playlistLoopToggle.checked = this.currentPlaylist.loop;

      this.renderTracks();
      this.populateSoundSelect();

      this.builderModal.classList.remove('hidden');
    } catch (error) {
      console.error('Error opening playlist builder:', error);
      alert(`Failed to open playlist: ${error.message}`);
    }
  }

  closeBuilder() {
    this.builderModal.classList.add('hidden');
    this.currentPlaylistId = null;
    this.currentPlaylist = null;
  }

  renderTracks() {
    this.playlistTracksContainer.innerHTML = '';

    if (!this.currentPlaylist.tracks || this.currentPlaylist.tracks.length === 0) {
      this.playlistTracksContainer.innerHTML = `
        <div class="text-center text-gray-500 py-4">
          No tracks yet. Add sounds using the dropdown below.
        </div>
      `;
      return;
    }

    this.currentPlaylist.tracks.forEach((track, index) => {
      const trackItem = this.createTrackItem(track, index);
      this.playlistTracksContainer.appendChild(trackItem);
    });
  }

  createTrackItem(track, index) {
    const trackItem = document.createElement('div');
    trackItem.className = 'playlist-track-item';
    trackItem.dataset.trackId = track.id;

    const soundName = track.sound ? track.sound.name : 'Unknown Sound';
    const soundEmoji = track.sound ? track.sound.emoji : '❓';

    trackItem.innerHTML = `
      <span class="track-number">${index + 1}.</span>
      <span class="track-emoji">${soundEmoji}</span>
      <span class="track-name">${this.escapeHtml(soundName)}</span>

      <div class="track-controls">
        <label class="track-control-label">
          Volume:
          <input type="range" class="track-volume" min="0" max="100" value="${Math.round(track.volume * 100)}" title="Volume">
          <span class="track-volume-value">${Math.round(track.volume * 100)}%</span>
        </label>

        <label class="track-control-label">
          Pause Min (s):
          <input type="number" class="pause-min" min="0" max="300" step="1" value="${track.pauseMin}" placeholder="0">
        </label>

        <label class="track-control-label">
          Pause Max (s):
          <input type="number" class="pause-max" min="0" max="300" step="1" value="${track.pauseMax}" placeholder="0">
        </label>
      </div>

      <div class="track-buttons">
        <button class="btn-icon move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn-icon move-down" title="Move Down" ${index === this.currentPlaylist.tracks.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn-icon remove-track" title="Remove Track">✕</button>
      </div>
    `;

    // Event listeners
    const volumeSlider = trackItem.querySelector('.track-volume');
    const volumeValue = trackItem.querySelector('.track-volume-value');
    const pauseMin = trackItem.querySelector('.pause-min');
    const pauseMax = trackItem.querySelector('.pause-max');
    const moveUpBtn = trackItem.querySelector('.move-up');
    const moveDownBtn = trackItem.querySelector('.move-down');
    const removeBtn = trackItem.querySelector('.remove-track');

    volumeSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      volumeValue.textContent = `${value}%`;
      this.handleUpdateTrack(track.id, { volume: value / 100 });
    });

    pauseMin.addEventListener('change', (e) => {
      this.handleUpdateTrack(track.id, { pauseMin: parseFloat(e.target.value) || 0 });
    });

    pauseMax.addEventListener('change', (e) => {
      this.handleUpdateTrack(track.id, { pauseMax: parseFloat(e.target.value) || 0 });
    });

    moveUpBtn.addEventListener('click', () => this.handleMoveTrack(index, -1));
    moveDownBtn.addEventListener('click', () => this.handleMoveTrack(index, 1));
    removeBtn.addEventListener('click', () => this.handleRemoveTrack(track.id));

    return trackItem;
  }

  populateSoundSelect() {
    this.addTrackSoundSelect.innerHTML = '<option value="">Select sound to add...</option>';

    // Group sounds by category
    const soundsByCategory = {
      sfx: [],
      music: [],
      ambience: []
    };

    this.allSounds.forEach(sound => {
      soundsByCategory[sound.category].push(sound);
    });

    // Add sounds by category
    const categoryLabels = {
      music: 'Background Music',
      ambience: 'Ambience',
      sfx: 'Sound Effects'
    };

    ['music', 'ambience', 'sfx'].forEach(category => {
      if (soundsByCategory[category].length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = categoryLabels[category];

        soundsByCategory[category].forEach(sound => {
          const option = document.createElement('option');
          option.value = sound.id;
          option.textContent = `${sound.emoji} ${sound.name}`;
          optgroup.appendChild(option);
        });

        this.addTrackSoundSelect.appendChild(optgroup);
      }
    });
  }

  async handleLoopToggle() {
    try {
      const newLoopState = this.playlistLoopToggle.checked;
      await this.soundLibrary.updatePlaylist(this.currentPlaylistId, { loop: newLoopState });
      this.currentPlaylist.loop = newLoopState;
    } catch (error) {
      console.error('Error updating loop:', error);
      alert(`Failed to update loop: ${error.message}`);
      this.playlistLoopToggle.checked = !this.playlistLoopToggle.checked;
    }
  }

  async handleAddTrack() {
    const soundId = this.addTrackSoundSelect.value;

    if (!soundId) {
      alert('Please select a sound to add');
      return;
    }

    try {
      const track = await this.soundLibrary.addTrackToPlaylist(this.currentPlaylistId, soundId, {
        volume: 0.8,
        pauseMin: 0,
        pauseMax: 0
      });

      // Reload playlist to get updated tracks
      this.currentPlaylist = await this.soundLibrary.getPlaylist(this.currentPlaylistId);

      this.renderTracks();
      this.addTrackSoundSelect.value = '';
    } catch (error) {
      console.error('Error adding track:', error);
      alert(`Failed to add track: ${error.message}`);
    }
  }

  async handleUpdateTrack(trackId, updates) {
    try {
      await this.soundLibrary.updatePlaylistTrack(this.currentPlaylistId, trackId, updates);

      // Update local track data
      const track = this.currentPlaylist.tracks.find(t => t.id === trackId);
      if (track) {
        Object.assign(track, updates);
      }
    } catch (error) {
      console.error('Error updating track:', error);
      alert(`Failed to update track: ${error.message}`);
    }
  }

  async handleMoveTrack(currentIndex, direction) {
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= this.currentPlaylist.tracks.length) {
      return;
    }

    try {
      // Swap tracks in local array
      const tracks = this.currentPlaylist.tracks;
      [tracks[currentIndex], tracks[newIndex]] = [tracks[newIndex], tracks[currentIndex]];

      // Get new order of track IDs
      const trackIds = tracks.map(t => t.id);

      // Update in database
      await this.soundLibrary.reorderPlaylistTracks(this.currentPlaylistId, trackIds);

      // Re-render
      this.renderTracks();
    } catch (error) {
      console.error('Error reordering tracks:', error);
      alert(`Failed to reorder tracks: ${error.message}`);

      // Reload playlist to reset state
      this.currentPlaylist = await this.soundLibrary.getPlaylist(this.currentPlaylistId);
      this.renderTracks();
    }
  }

  async handleRemoveTrack(trackId) {
    try {
      await this.soundLibrary.removeTrackFromPlaylist(this.currentPlaylistId, trackId);

      // Remove from local array
      this.currentPlaylist.tracks = this.currentPlaylist.tracks.filter(t => t.id !== trackId);

      this.renderTracks();
    } catch (error) {
      console.error('Error removing track:', error);
      alert(`Failed to remove track: ${error.message}`);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
