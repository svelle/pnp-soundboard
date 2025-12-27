// Playlist Player - Sticky widget showing current playlist playback

export class PlaylistPlayer {
  constructor(audioManager) {
    this.audioManager = audioManager;

    this.widget = null;
    this.updateInterval = null;

    this.createWidget();
    this.setupEventListeners();
    this.startUpdateLoop();
  }

  createWidget() {
    // Create widget HTML
    this.widget = document.createElement('div');
    this.widget.id = 'playlistPlayerWidget';
    this.widget.className = 'playlist-player-widget hidden';
    this.widget.innerHTML = `
      <div class="playlist-player-header">
        <div class="playlist-player-title">Now Playing</div>
        <button class="playlist-player-close" id="closePlaylistPlayer">✕</button>
      </div>

      <div class="playlist-player-name" id="playlistPlayerName">Playlist Name</div>

      <div class="playlist-player-progress" id="playlistPlayerProgress">
        Track <span id="currentTrackNum">1</span> of <span id="totalTracks">5</span>
      </div>

      <div class="playlist-player-track" id="playlistPlayerTrack">
        <span id="currentTrackEmoji">🎵</span>
        <span id="currentTrackName">Track Name</span>
      </div>

      <div class="playlist-player-controls">
        <button id="previousTrackBtn" title="Previous Track">⏮️</button>
        <button id="playPausePlaylistBtn" title="Play/Pause">⏸️</button>
        <button id="stopPlaylistBtn" title="Stop Playlist">⏹️</button>
        <button id="nextTrackBtn" title="Next Track">⏭️</button>
      </div>

      <details id="playlistPlayerDetails">
        <summary style="cursor: pointer; padding: 8px 0; font-size: 0.875rem; color: #9ca3af; user-select: none;">
          Track List
        </summary>
        <div class="playlist-player-tracklist" id="playlistPlayerTracklist">
          <!-- Track items will be dynamically populated -->
        </div>
      </details>
    `;

    document.body.appendChild(this.widget);

    // Get references
    this.closeBtn = document.getElementById('closePlaylistPlayer');
    this.playlistName = document.getElementById('playlistPlayerName');
    this.currentTrackNum = document.getElementById('currentTrackNum');
    this.totalTracks = document.getElementById('totalTracks');
    this.currentTrackEmoji = document.getElementById('currentTrackEmoji');
    this.currentTrackName = document.getElementById('currentTrackName');
    this.previousBtn = document.getElementById('previousTrackBtn');
    this.playPauseBtn = document.getElementById('playPausePlaylistBtn');
    this.stopBtn = document.getElementById('stopPlaylistBtn');
    this.nextBtn = document.getElementById('nextTrackBtn');
    this.tracklist = document.getElementById('playlistPlayerTracklist');
    this.details = document.getElementById('playlistPlayerDetails');
  }

  setupEventListeners() {
    this.closeBtn.addEventListener('click', () => {
      this.hide();
    });

    this.previousBtn.addEventListener('click', () => {
      this.handlePrevious();
    });

    this.playPauseBtn.addEventListener('click', () => {
      this.handlePlayPause();
    });

    this.stopBtn.addEventListener('click', () => {
      this.handleStop();
    });

    this.nextBtn.addEventListener('click', () => {
      this.handleNext();
    });
  }

  async handlePrevious() {
    await this.audioManager.skipToPreviousTrack();
    this.update();
  }

  async handlePlayPause() {
    const state = this.audioManager.getCurrentPlaylistState();
    if (!state) return;

    if (state.isPlaying) {
      this.audioManager.pausePlaylist();
      this.playPauseBtn.textContent = '▶️';
    } else {
      await this.audioManager.resumePlaylist();
      this.playPauseBtn.textContent = '⏸️';
    }
  }

  handleStop() {
    this.audioManager.stopPlaylist();
    this.hide();
  }

  async handleNext() {
    await this.audioManager.skipToNextTrack();
    this.update();
  }

  startUpdateLoop() {
    // Update widget every 500ms to reflect playback state
    this.updateInterval = setInterval(() => {
      const state = this.audioManager.getCurrentPlaylistState();

      if (state) {
        // Show widget if hidden
        if (this.widget.classList.contains('hidden')) {
          this.show();
        }

        this.update();
      } else {
        // Hide widget if no playlist playing
        if (!this.widget.classList.contains('hidden')) {
          this.hide();
        }
      }
    }, 500);
  }

  update() {
    const state = this.audioManager.getCurrentPlaylistState();
    if (!state) {
      this.hide();
      return;
    }

    // Update playlist info
    this.playlistName.textContent = state.playlistName;
    this.currentTrackNum.textContent = state.currentTrackIndex + 1;
    this.totalTracks.textContent = state.totalTracks;

    // Update current track
    if (state.currentTrack) {
      const sound = state.currentTrack.sound || {};
      this.currentTrackEmoji.textContent = sound.emoji || '🎵';
      this.currentTrackName.textContent = state.currentTrack.soundName;
    }

    // Update play/pause button
    this.playPauseBtn.textContent = state.isPlaying ? '⏸️' : '▶️';

    // Update tracklist if details are open
    if (this.details.open) {
      this.renderTracklist(state);
    }
  }

  renderTracklist(state) {
    if (!state || !state.playlist || !state.playlist.tracks) return;

    this.tracklist.innerHTML = '';

    state.playlist.tracks.forEach((track, index) => {
      const item = document.createElement('div');
      item.className = 'playlist-player-tracklist-item';
      if (index === state.currentTrackIndex) {
        item.classList.add('current');
      }

      const sound = track.sound || {};
      item.innerHTML = `
        <span class="track-number">${index + 1}.</span>
        <span class="track-emoji">${sound.emoji || '🎵'}</span>
        <span class="track-name" style="flex: 1;">${this.escapeHtml(sound.name || 'Unknown')}</span>
      `;

      item.addEventListener('click', async () => {
        await this.audioManager.skipToTrack(index);
        this.update();
      });

      this.tracklist.appendChild(item);
    });
  }

  show() {
    this.widget.classList.remove('hidden');
    this.update();
  }

  hide() {
    this.widget.classList.add('hidden');
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.widget && this.widget.parentNode) {
      this.widget.parentNode.removeChild(this.widget);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
