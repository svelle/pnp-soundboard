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

    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn-primary play-btn';
    playBtn.innerHTML = '▶️';
    playBtn.title = 'Play';

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
    buttons.appendChild(playBtn);
    if (sound.category === CATEGORIES.MUSIC || sound.category === CATEGORIES.AMBIENCE) {
      buttons.appendChild(loopBtn);
      buttons.appendChild(pauseBtn);
    }
    buttons.appendChild(deleteBtn);

    controls.appendChild(buttons);

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
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pauseBtn = card.querySelector('.pause-btn');
      this.togglePlay(sound.id, card, playBtn, loopBtn, pauseBtn);
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
   * Toggle play/stop for a sound
   * @param {string} soundId - Sound ID
   * @param {HTMLElement} card - Sound card element
   * @param {HTMLElement} playBtn - Play button element
   * @param {HTMLElement} loopBtn - Loop button element
   * @param {HTMLElement} pauseBtn - Pause interval button element
   */
  async togglePlay(soundId, card, playBtn, loopBtn, pauseBtn) {
    try {
      const isPlaying = this.playingSounds.has(soundId);

      if (isPlaying) {
        // Stop sound
        this.stopSound(soundId);
        card.classList.remove('playing');
        playBtn.innerHTML = '▶️';
        playBtn.title = 'Play';
      } else {
        // Play sound
        const shouldLoop = loopBtn && loopBtn.classList.contains('active');
        const usePauseInterval = pauseBtn && pauseBtn.classList.contains('active');

        const options = {
          loop: shouldLoop,
          volume: 0.8
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
        playBtn.innerHTML = '⏹️';
        playBtn.title = 'Stop';

        // Show stop all button
        this.stopAllBtn.classList.remove('hidden');

        // Setup track ended callback (for non-looping)
        if (!shouldLoop) {
          // Auto-update UI when track ends
          setTimeout(() => {
            const trackIds = this.playingSounds.get(soundId) || [];
            const stillPlaying = trackIds.some(id =>
              this.audioManager.getActiveTracks().some(t => t.trackId === id && t.isPlaying)
            );

            if (!stillPlaying) {
              card.classList.remove('playing');
              playBtn.innerHTML = '▶️';
              playBtn.title = 'Play';
              this.playingSounds.delete(soundId);

              // Hide stop all if no sounds playing
              if (this.playingSounds.size === 0) {
                this.stopAllBtn.classList.add('hidden');
              }
            }
          }, (await this.soundLibrary.get(soundId)).duration * 1000 + 100);
        }
      }

    } catch (error) {
      console.error('Error toggling play:', error);
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

    // Update UI
    const card = document.querySelector(`[data-sound-id="${soundId}"]`);
    if (card) {
      card.classList.remove('playing');
      const playBtn = card.querySelector('.play-btn');
      if (playBtn) {
        playBtn.innerHTML = '▶️';
        playBtn.title = 'Play';
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

    // Update all cards
    document.querySelectorAll('.sound-card.playing').forEach(card => {
      card.classList.remove('playing');
      const playBtn = card.querySelector('.play-btn');
      if (playBtn) {
        playBtn.innerHTML = '▶️';
        playBtn.title = 'Play';
      }
    });

    this.stopAllBtn.classList.add('hidden');
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
}
