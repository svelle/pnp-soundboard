// Main Application Entry Point

import { IndexedDBManager } from './storage/IndexedDBManager.js';
import { SoundLibrary } from './storage/SoundLibrary.js';
import { ServerStorage } from './storage/ServerStorage.js';
import { AudioMixer } from './audio/AudioMixer.js';
import { AudioManager } from './audio/AudioManager.js';
import { UIController } from './ui/UIController.js';

class DnDSoundboard {
  constructor() {
    this.mode = 'local'; // 'local' or 'server'
    this.dbManager = null;
    this.soundLibrary = null;
    this.audioMixer = null;
    this.audioManager = null;
    this.uiController = null;
    this.preloadedSounds = null;

    this.initialized = false;
  }

  /**
   * Detect if running in server mode
   */
  async detectMode() {
    try {
      const response = await fetch('/api/mode', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        return data.mode || 'local';
      }
    } catch (error) {
      // API not available, assume local mode
    }
    return 'local';
  }

  /**
   * Prompt for password (server mode only)
   */
  async promptForPassword() {
    return new Promise((resolve) => {
      const password = prompt('Enter soundboard password for uploading/deleting sounds:');
      resolve(password);
    });
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🎲 Initializing D&D Soundboard...');

      // Detect mode
      this.mode = await this.detectMode();
      console.log(`📡 Mode: ${this.mode}`);

      // Step 1: Initialize Audio Mixer (Web Audio API)
      console.log('🔊 Initializing audio system...');
      this.audioMixer = new AudioMixer();

      // Step 2: Initialize storage based on mode
      if (this.mode === 'server') {
        console.log('📦 Initializing server storage...');
        this.soundLibrary = new ServerStorage(null);
        // We'll set the audioContext later after user interaction
      } else {
        console.log('📦 Initializing local database...');
        this.dbManager = new IndexedDBManager();
        await this.dbManager.init();

        console.log('🎵 Initializing sound library...');
        this.soundLibrary = new SoundLibrary(this.dbManager, null);
        // We'll set the audioContext later after user interaction
      }

      // Step 3: Initialize Audio Manager
      console.log('🎛️ Initializing audio manager...');
      this.audioManager = new AudioManager(this.audioMixer, this.soundLibrary);

      // Step 4: Initialize UI Controller
      console.log('🎨 Initializing UI...');
      this.uiController = new UIController(
        this.audioMixer,
        this.audioManager,
        this.soundLibrary,
        this.mode,
        () => this.promptForPassword()
      );

      // Setup user interaction handler for mobile
      this.setupUserInteractionHandler();

      // Initialize UI (load sounds, etc.)
      await this.uiController.init();

      // Step 5: Pre-load sounds in server mode
      if (this.mode === 'server') {
        console.log('📥 Pre-loading sounds...');
        await this.preloadSounds();
      }

      this.initialized = true;
      console.log('✅ D&D Soundboard initialized successfully!');

    } catch (error) {
      console.error('❌ Failed to initialize D&D Soundboard:', error);
      this.showErrorMessage(error);
    }
  }

  /**
   * Pre-load sounds from server
   */
  async preloadSounds() {
    if (this.mode !== 'server' || !this.soundLibrary.preloadAllSounds) {
      return;
    }

    try {
      // Initialize AudioContext first (required for decoding)
      if (!this.audioMixer.initialized) {
        this.audioMixer.init();
        this.soundLibrary.audioContext = this.audioMixer.context;
      }

      // Pre-load with progress callbacks
      this.preloadedSounds = await this.soundLibrary.preloadAllSounds(
        (soundId, status, progress) => {
          // Notify UI of loading progress
          if (this.uiController && this.uiController.soundBoard) {
            this.uiController.soundBoard.updateLoadingStatus(soundId, status, progress);
          }
        }
      );

      console.log(`✅ Pre-loaded ${this.preloadedSounds.size} sounds`);
    } catch (error) {
      console.error('Error pre-loading sounds:', error);
    }
  }

  /**
   * Setup handler for first user interaction (required for Web Audio API on mobile)
   */
  setupUserInteractionHandler() {
    const initAudioContext = async () => {
      if (!this.audioMixer.initialized) {
        try {
          console.log('🎧 Initializing Web Audio API...');
          this.audioMixer.init();

          // Now that we have an AudioContext, update the SoundLibrary
          this.soundLibrary.audioContext = this.audioMixer.context;

          // Resume if suspended
          await this.audioMixer.resume();

          console.log('✅ Web Audio API ready');
        } catch (error) {
          console.error('Failed to initialize Web Audio API:', error);
        }
      } else {
        // Just resume if already initialized
        await this.audioMixer.resume();
      }
    };

    // Listen for first user interaction
    const events = ['click', 'touchstart', 'keydown'];

    const handleFirstInteraction = () => {
      initAudioContext();

      // Remove listeners after first interaction
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };

    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });
  }

  /**
   * Show error message to user
   * @param {Error} error - Error object
   */
  showErrorMessage(error) {
    const message = document.createElement('div');
    message.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    message.innerHTML = `
      <div class="font-bold">Error</div>
      <div class="text-sm">${error.message}</div>
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 5000);
  }
}

// Initialize application when DOM is ready
let app;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new DnDSoundboard();
    app.init();
    // Make app instance available globally for debugging
    window.dndSoundboard = app;
  });
} else {
  app = new DnDSoundboard();
  app.init();
  // Make app instance available globally for debugging
  window.dndSoundboard = app;
}
