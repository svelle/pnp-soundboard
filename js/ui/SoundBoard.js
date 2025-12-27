// Sound Board - Renders and manages sound cards

import { CATEGORIES, CATEGORY_LABELS } from '../utils/constants.js';
import { formatDuration } from '../utils/helpers.js';

export class SoundBoard {
  constructor(audioManager, soundLibrary, volumeControls) {
    this.audioManager = audioManager;
    this.soundLibrary = soundLibrary;
    this.volumeControls = volumeControls;

    // Track which sounds are currently playing
    this.playingSounds = new Map(); // soundId -> array of trackIds

    // Track progress update intervals
    this.progressIntervals = new Map(); // soundId -> intervalId

    this.emptyState = document.getElementById('emptyState');
    this.stopAllBtn = document.getElementById('stopAllBtn');

    this.sections = {
      [CATEGORIES.SFX]: {
        section: document.getElementById('sfxSection'),
        grid: document.getElementById('sfxGrid'),
        count: document.getElementById('sfxCount')
      },
      [CATEGORIES.MUSIC]: {
        section: document.getElementById('musicSection'),
        grid: document.getElementById('musicGrid'),
        count: document.getElementById('musicCount')
      },
      [CATEGORIES.AMBIENCE]: {
        section: document.getElementById('ambienceSection'),
        grid: document.getElementById('ambienceGrid'),
        count: document.getElementById('ambienceCount')
      }
    };

    this.init();
  }

  init() {
    // Stop all button
    this.stopAllBtn.addEventListener('click', () => {
      this.stopAll();
    });
  }

  /**
   * Load and render all sounds
   */
  async loadSounds() {
    try {
      const sounds = await this.soundLibrary.getAllSounds();

      // Clear all grids
      Object.values(this.sections).forEach(({ grid }) => {
        grid.innerHTML = '';
      });

      if (sounds.length === 0) {
        this.showEmptyState();
        return;
      }

      this.hideEmptyState();

      // Group sounds by category and render
      const soundsByCategory = {
        [CATEGORIES.SFX]: [],
        [CATEGORIES.MUSIC]: [],
        [CATEGORIES.AMBIENCE]: []
      };

      sounds.forEach(sound => {
        soundsByCategory[sound.category].push(sound);
      });

      // Render each category
      Object.keys(soundsByCategory).forEach(category => {
        const categorySounds = soundsByCategory[category];
        const { section, grid, count } = this.sections[category];

        if (categorySounds.length > 0) {
          section.classList.remove('hidden');
          count.textContent = `(${categorySounds.length})`;

          categorySounds.forEach(sound => {
            const card = this.createSoundCard(sound);
            grid.appendChild(card);
          });
        } else {
          section.classList.add('hidden');
        }
      });

    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  }

  /**
   * Create a sound card element
   * @param {Object} sound - Sound data
   * @returns {HTMLElement} Sound card element
   */
  createSoundCard(sound) {
    const card = document.createElement('div');
    card.className = 'sound-card';
    card.dataset.soundId = sound.id;

    // Emoji
    const emoji = document.createElement('div');
    emoji.className = 'sound-emoji';
    emoji.textContent = sound.emoji || '🔊';

    // Name
    const name = document.createElement('div');
    name.className = 'sound-name';
    name.textContent = sound.name;
    name.title = sound.name; // Tooltip for long names

    // Duration (if available)
    const duration = document.createElement('div');
    duration.className = 'text-xs text-gray-400 text-center';
    duration.textContent = sound.duration ? formatDuration(sound.duration) : '';

    // Controls container
    const controls = document.createElement('div');
    controls.className = 'sound-controls';

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'sound-buttons';

    // Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'btn btn-primary play-pause-btn';
    playPauseBtn.innerHTML = '▶️';
    playPauseBtn.title = 'Play';

    // Stop button
    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn btn-secondary stop-btn';
    stopBtn.innerHTML = '⏹️';
    stopBtn.title = 'Stop';

    // Loop button (for music and ambience)
    const loopBtn = document.createElement('button');
    loopBtn.className = 'btn btn-secondary loop-btn';
    loopBtn.innerHTML = '🔁';
    loopBtn.title = 'Loop';

    // Random pause button (for music and ambience)
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'btn btn-secondary pause-btn';
    pauseBtn.innerHTML = '⏸️';
    pauseBtn.title = 'Random pauses between loops';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete';

    // Add buttons
    buttons.appendChild(playPauseBtn);
    buttons.appendChild(stopBtn);
    if (sound.category === CATEGORIES.MUSIC || sound.category === CATEGORIES.AMBIENCE) {
      buttons.appendChild(loopBtn);
      buttons.appendChild(pauseBtn);
    }
    buttons.appendChild(deleteBtn);

    controls.appendChild(buttons);

    // Volume slider
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'volume-container mt-2';

    const volumeLabel = document.createElement('div');
    volumeLabel.className = 'text-xs text-gray-400 mb-1 flex justify-between';
    volumeLabel.innerHTML = `
      <span>Volume</span>
      <span class="volume-value">80%</span>
    `;

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '80';
    volumeSlider.className = 'w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700';
    volumeSlider.style.setProperty('--value', '80%');

    volumeContainer.appendChild(volumeLabel);
    volumeContainer.appendChild(volumeSlider);
    controls.appendChild(volumeContainer);

    // Store volume value
    let currentVolume = 0.8;

    // Volume slider events
    volumeSlider.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    volumeSlider.addEventListener('input', (e) => {
      e.stopPropagation();
      const value = parseInt(e.target.value);
      currentVolume = value / 100;

      // Update visual
      volumeSlider.style.setProperty('--value', `${value}%`);
      volumeLabel.querySelector('.volume-value').textContent = `${value}%`;

      // Update all active tracks for this sound
      const trackIds = this.playingSounds.get(sound.id) || [];
      trackIds.forEach(trackId => {
        this.audioManager.setTrackVolume(trackId, currentVolume);
      });
    });

    // Store volume reference
    card.volumeSlider = volumeSlider;
    card.getCurrentVolume = () => currentVolume;

    // Progress bar for music and ambience
    if (sound.category === CATEGORIES.MUSIC || sound.category === CATEGORIES.AMBIENCE) {
      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-container mt-2';

      const progressLabel = document.createElement('div');
      progressLabel.className = 'text-xs text-gray-400 mb-1 flex justify-between';
      progressLabel.innerHTML = `
        <span>Progress</span>
        <span class="progress-time">0:00 / ${formatDuration(sound.duration || 0)}</span>
      `;

      const progressBarBg = document.createElement('div');
      progressBarBg.className = 'progress-bar-bg';

      const progressBarFill = document.createElement('div');
      progressBarFill.className = 'progress-bar-fill';
      progressBarFill.style.width = '0%';

      progressBarBg.appendChild(progressBarFill);
      progressContainer.appendChild(progressLabel);
      progressContainer.appendChild(progressBarBg);
      controls.appendChild(progressContainer);

      // Store progress references
      card.progressBarFill = progressBarFill;
      card.progressTimeLabel = progressLabel.querySelector('.progress-time');
      card.soundDuration = sound.duration || 0;
    }

    // Pause interval controls (hidden by default)
    if (sound.category === CATEGORIES.MUSIC || sound.category === CATEGORIES.AMBIENCE) {
      const pauseControls = document.createElement('div');
      pauseControls.className = 'pause-controls hidden mt-2';

      const pauseLabel = document.createElement('div');
      pauseLabel.className = 'text-xs text-gray-400 mb-1';
      pauseLabel.textContent = 'Pause interval (seconds):';

      const pauseInputs = document.createElement('div');
      pauseInputs.className = 'flex gap-2 items-center text-xs';

      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.min = '0';
      minInput.max = '60';
      minInput.value = '5';
      minInput.className = 'w-12 px-1 py-1 bg-gray-700 border border-gray-600 rounded text-center';
      minInput.placeholder = 'Min';

      const separator = document.createElement('span');
      separator.textContent = '-';
      separator.className = 'text-gray-500';

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.min = '0';
      maxInput.max = '120';
      maxInput.value = '15';
      maxInput.className = 'w-12 px-1 py-1 bg-gray-700 border border-gray-600 rounded text-center';
      maxInput.placeholder = 'Max';

      pauseInputs.appendChild(minInput);
      pauseInputs.appendChild(separator);
      pauseInputs.appendChild(maxInput);

      pauseControls.appendChild(pauseLabel);
      pauseControls.appendChild(pauseInputs);

      controls.appendChild(pauseControls);

      // Store references
      card.pauseControls = pauseControls;
      card.pauseMinInput = minInput;
      card.pauseMaxInput = maxInput;
    }

    // Assemble card
    card.appendChild(emoji);
    card.appendChild(name);
    if (duration.textContent) {
      card.appendChild(duration);
    }
    card.appendChild(controls);

    // Event listeners
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pauseBtn = card.querySelector('.pause-btn');
      this.togglePlayPause(sound.id, card, playPauseBtn, loopBtn, pauseBtn);
    });

    stopBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.stopSound(sound.id);
      card.classList.remove('playing', 'paused');
      playPauseBtn.innerHTML = '▶️';
      playPauseBtn.title = 'Play';
    });

    if (sound.category === CATEGORIES.MUSIC || sound.category === CATEGORIES.AMBIENCE) {
      loopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loopBtn.classList.toggle('active');
      });

      pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pauseBtn.classList.toggle('active');
        // Show/hide pause interval inputs
        if (card.pauseControls) {
          card.pauseControls.classList.toggle('hidden');
        }
      });

      // Prevent input events from bubbling
      if (card.pauseMinInput) {
        card.pauseMinInput.addEventListener('click', (e) => e.stopPropagation());
        card.pauseMinInput.addEventListener('input', (e) => e.stopPropagation());
      }
      if (card.pauseMaxInput) {
        card.pauseMaxInput.addEventListener('click', (e) => e.stopPropagation());
        card.pauseMaxInput.addEventListener('input', (e) => e.stopPropagation());
      }
    }

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteSound(sound.id, card);
    });

    return card;
  }

  /**
   * Toggle play/pause for a sound
   * @param {string} soundId - Sound ID
   * @param {HTMLElement} card - Sound card element
   * @param {HTMLElement} playPauseBtn - Play/Pause button element
   * @param {HTMLElement} loopBtn - Loop button element
   * @param {HTMLElement} pauseBtn - Pause interval button element
   */
  async togglePlayPause(soundId, card, playPauseBtn, loopBtn, pauseBtn) {
    try {
      const trackIds = this.playingSounds.get(soundId) || [];

      // Check if any track is paused
      const isPaused = trackIds.some(trackId => {
        const activeTrack = this.audioManager.getActiveTracks().find(t => t.trackId === trackId);
        return activeTrack && activeTrack.track && activeTrack.track.isPaused();
      });

      // Check if playing
      const isPlaying = trackIds.some(trackId => {
        const activeTrack = this.audioManager.getActiveTracks().find(t => t.trackId === trackId);
        return activeTrack && activeTrack.isPlaying;
      });

      if (isPaused) {
        // Resume
        for (const trackId of trackIds) {
          await this.audioManager.resumeTrack(trackId);
        }
        card.classList.remove('paused');
        card.classList.add('playing');
        playPauseBtn.innerHTML = '⏸️';
        playPauseBtn.title = 'Pause';

        // Resume progress tracking
        if (card.progressBarFill && card.soundDuration) {
          this.startProgressTracking(soundId, card);
        }
      } else if (isPlaying) {
        // Pause
        for (const trackId of trackIds) {
          this.audioManager.pauseTrack(trackId);
        }
        card.classList.remove('playing');
        card.classList.add('paused');
        playPauseBtn.innerHTML = '▶️';
        playPauseBtn.title = 'Resume';

        // Stop progress tracking but keep current progress
        this.stopProgressTracking(soundId);
      } else {
        // Start playing
        const shouldLoop = loopBtn && loopBtn.classList.contains('active');
        const usePauseInterval = pauseBtn && pauseBtn.classList.contains('active');

        const options = {
          loop: shouldLoop,
          volume: card.getCurrentVolume ? card.getCurrentVolume() : 0.8
        };

        // Add pause interval settings if enabled
        if (usePauseInterval && card.pauseMinInput && card.pauseMaxInput) {
          const pauseMin = parseFloat(card.pauseMinInput.value) || 5;
          const pauseMax = parseFloat(card.pauseMaxInput.value) || 15;

          // Ensure min <= max
          options.pauseMin = Math.min(pauseMin, pauseMax);
          options.pauseMax = Math.max(pauseMin, pauseMax);
        }

        const trackId = await this.audioManager.playSound(soundId, options);

        // Track playing sound
        if (!this.playingSounds.has(soundId)) {
          this.playingSounds.set(soundId, []);
        }
        this.playingSounds.get(soundId).push(trackId);

        card.classList.add('playing');
        playPauseBtn.innerHTML = '⏸️';
        playPauseBtn.title = 'Pause';

        // Show stop all button
        this.stopAllBtn.classList.remove('hidden');

        // Start progress tracking for music/ambience
        if (card.progressBarFill && card.soundDuration) {
          this.startProgressTracking(soundId, card);
        }

        // Setup track ended callback (for non-looping)
        if (!shouldLoop) {
          // Get sound to determine duration for cleanup
          const sound = await this.soundLibrary.getSound(soundId);
          const duration = sound.duration || 60; // Default to 60s if duration unknown

          // Auto-update UI when track ends
          setTimeout(() => {
            const trackIds = this.playingSounds.get(soundId) || [];
            const stillPlaying = trackIds.some(id =>
              this.audioManager.getActiveTracks().some(t => t.trackId === id && t.isPlaying)
            );

            if (!stillPlaying) {
              card.classList.remove('playing');
              playPauseBtn.innerHTML = '▶️';
              playPauseBtn.title = 'Play';
              this.playingSounds.delete(soundId);

              // Hide stop all if no sounds playing
              if (this.playingSounds.size === 0) {
                this.stopAllBtn.classList.add('hidden');
              }
            }
          }, duration * 1000 + 100);
        }
      }

    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }

  /**
   * Stop a specific sound
   * @param {string} soundId - Sound ID
   */
  stopSound(soundId) {
    const trackIds = this.playingSounds.get(soundId) || [];

    trackIds.forEach(trackId => {
      this.audioManager.stopTrack(trackId);
    });

    this.playingSounds.delete(soundId);

    // Stop progress tracking
    this.stopProgressTracking(soundId);

    // Update UI
    const card = document.querySelector(`[data-sound-id="${soundId}"]`);
    if (card) {
      card.classList.remove('playing', 'paused');
      const playPauseBtn = card.querySelector('.play-pause-btn');
      if (playPauseBtn) {
        playPauseBtn.innerHTML = '▶️';
        playPauseBtn.title = 'Play';
      }

      // Reset progress bar
      if (card.progressBarFill) {
        card.progressBarFill.style.width = '0%';
        if (card.progressTimeLabel && card.soundDuration) {
          card.progressTimeLabel.textContent = `0:00 / ${formatDuration(card.soundDuration)}`;
        }
      }
    }

    // Hide stop all if no sounds playing
    if (this.playingSounds.size === 0) {
      this.stopAllBtn.classList.add('hidden');
    }
  }

  /**
   * Stop all playing sounds
   */
  stopAll() {
    this.audioManager.stopAll();
    this.playingSounds.clear();

    // Stop all progress tracking
    for (const soundId of this.progressIntervals.keys()) {
      this.stopProgressTracking(soundId);
    }

    // Update all cards
    document.querySelectorAll('.sound-card.playing, .sound-card.paused').forEach(card => {
      card.classList.remove('playing', 'paused');
      const playPauseBtn = card.querySelector('.play-pause-btn');
      if (playPauseBtn) {
        playPauseBtn.innerHTML = '▶️';
        playPauseBtn.title = 'Play';
      }

      // Reset progress bars
      if (card.progressBarFill) {
        card.progressBarFill.style.width = '0%';
        if (card.progressTimeLabel && card.soundDuration) {
          card.progressTimeLabel.textContent = `0:00 / ${formatDuration(card.soundDuration)}`;
        }
      }
    });

    this.stopAllBtn.classList.add('hidden');
  }

  /**
   * Start tracking progress for a sound
   * @param {string} soundId - Sound ID
   * @param {HTMLElement} card - Sound card element
   */
  startProgressTracking(soundId, card) {
    // Clear existing interval if any
    this.stopProgressTracking(soundId);

    // Update progress every 100ms
    const intervalId = setInterval(() => {
      const trackIds = this.playingSounds.get(soundId) || [];

      if (trackIds.length === 0) {
        this.stopProgressTracking(soundId);
        return;
      }

      // Get the first track's current time
      const firstTrackId = trackIds[0];
      const activeTracks = this.audioManager.getActiveTracks();
      const activeTrack = activeTracks.find(t => t.trackId === firstTrackId);

      if (activeTrack && activeTrack.track) {
        const currentTime = activeTrack.track.getCurrentTime();
        const duration = card.soundDuration || 1;

        // Calculate progress percentage
        let progress = (currentTime / duration) * 100;

        // Handle looping - reset to 0 when exceeds 100%
        if (progress > 100) {
          progress = progress % 100;
        }

        // Update progress bar
        card.progressBarFill.style.width = `${Math.min(progress, 100)}%`;

        // Update time label
        if (card.progressTimeLabel) {
          const displayTime = currentTime % duration; // Handle looping
          card.progressTimeLabel.textContent = `${formatDuration(displayTime)} / ${formatDuration(duration)}`;
        }
      }
    }, 100);

    this.progressIntervals.set(soundId, intervalId);
  }

  /**
   * Stop tracking progress for a sound
   * @param {string} soundId - Sound ID
   */
  stopProgressTracking(soundId) {
    const intervalId = this.progressIntervals.get(soundId);
    if (intervalId) {
      clearInterval(intervalId);
      this.progressIntervals.delete(soundId);
    }
  }

  /**
   * Delete a sound
   * @param {string} soundId - Sound ID
   * @param {HTMLElement} card - Sound card element
   */
  async deleteSound(soundId, card) {
    if (!confirm('Are you sure you want to delete this sound?')) {
      return;
    }

    try {
      // Stop if playing
      if (this.playingSounds.has(soundId)) {
        this.stopSound(soundId);
      }

      // Delete from library
      await this.soundLibrary.deleteSound(soundId);

      // Remove card with animation
      card.style.opacity = '0';
      card.style.transform = 'scale(0.8)';

      setTimeout(() => {
        card.remove();

        // Update count
        const category = card.closest('[id$="Section"]').id.replace('Section', '');
        const categoryKey = Object.keys(CATEGORIES).find(
          key => CATEGORIES[key] === category.toLowerCase()
        );

        if (categoryKey) {
          const { section, grid, count } = this.sections[CATEGORIES[categoryKey]];
          const remainingCards = grid.querySelectorAll('.sound-card').length;

          count.textContent = `(${remainingCards})`;

          if (remainingCards === 0) {
            section.classList.add('hidden');
          }
        }

        // Check if no sounds remain
        const totalSounds = document.querySelectorAll('.sound-card').length;
        if (totalSounds === 0) {
          this.showEmptyState();
        }
      }, 200);

    } catch (error) {
      console.error('Error deleting sound:', error);
      alert('Failed to delete sound. Please try again.');
    }
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    this.emptyState.classList.remove('hidden');
    Object.values(this.sections).forEach(({ section }) => {
      section.classList.add('hidden');
    });
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    this.emptyState.classList.add('hidden');
  }

  /**
   * Add a new sound card
   * @param {Object} sound - Sound data
   */
  addSound(sound) {
    const { section, grid, count } = this.sections[sound.category];

    // Hide empty state
    this.hideEmptyState();

    // Show section
    section.classList.remove('hidden');

    // Create and add card
    const card = this.createSoundCard(sound);
    grid.appendChild(card);

    // Update count
    const cardCount = grid.querySelectorAll('.sound-card').length;
    count.textContent = `(${cardCount})`;

    // Animate in
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    setTimeout(() => {
      card.style.transition = 'all 0.3s';
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    }, 10);
  }

  /**
   * Update loading status for a sound card (server mode pre-loading)
   * @param {string} soundId - Sound ID
   * @param {string} status - 'loading', 'ready', or 'error'
   * @param {number} progress - Progress from 0 to 1
   */
  updateLoadingStatus(soundId, status, progress) {
    const card = document.querySelector(`[data-sound-id="${soundId}"]`);
    if (!card) return;

    // Get or create loading overlay
    let loadingOverlay = card.querySelector('.loading-overlay');

    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading...</div>
        <div class="loading-progress-bar">
          <div class="loading-progress-fill"></div>
        </div>
      `;
      card.appendChild(loadingOverlay);
    }

    const progressBar = loadingOverlay.querySelector('.loading-progress-fill');
    const loadingText = loadingOverlay.querySelector('.loading-text');

    if (status === 'loading') {
      loadingOverlay.classList.remove('hidden');
      if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
      }
      if (loadingText) {
        loadingText.textContent = `Loading ${Math.round(progress * 100)}%`;
      }
    } else if (status === 'ready') {
      if (progressBar) {
        progressBar.style.width = '100%';
      }
      if (loadingText) {
        loadingText.textContent = 'Ready!';
      }

      // Remove overlay after brief delay
      setTimeout(() => {
        loadingOverlay.remove();
      }, 500);
    } else if (status === 'error') {
      if (loadingText) {
        loadingText.textContent = 'Error';
        loadingText.style.color = '#ef4444';
      }
      loadingOverlay.classList.add('error');
    }
  }
}
