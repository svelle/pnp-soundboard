// Main Application Entry Point

import { IndexedDBManager } from './storage/IndexedDBManager.js';
import { SoundLibrary } from './storage/SoundLibrary.js';
import { AudioMixer } from './audio/AudioMixer.js';
import { AudioManager } from './audio/AudioManager.js';
import { UIController } from './ui/UIController.js';

class DnDSoundboard {
  constructor() {
    this.dbManager = null;
    this.soundLibrary = null;
    this.audioMixer = null;
    this.audioManager = null;
    this.uiController = null;

    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🎲 Initializing D&D Soundboard...');

      // Step 1: Initialize IndexedDB
      console.log('📦 Initializing database...');
      this.dbManager = new IndexedDBManager();
      await this.dbManager.init();

      // Step 2: Initialize Audio Mixer (Web Audio API)
      console.log('🔊 Initializing audio system...');
      this.audioMixer = new AudioMixer();

      // Note: We don't initialize the AudioContext yet - it must be initialized
      // after user interaction on mobile browsers

      // Step 3: Initialize Sound Library
      console.log('🎵 Initializing sound library...');
      this.soundLibrary = new SoundLibrary(this.dbManager, null);
      // We'll set the audioContext later after user interaction

      // Step 4: Initialize Audio Manager
      console.log('🎛️ Initializing audio manager...');
      this.audioManager = new AudioManager(this.audioMixer, this.soundLibrary);

      // Step 5: Initialize UI Controller
      console.log('🎨 Initializing UI...');
      this.uiController = new UIController(
        this.audioMixer,
        this.audioManager,
        this.soundLibrary
      );

      // Setup user interaction handler for mobile
      this.setupUserInteractionHandler();

      // Initialize UI (load sounds, etc.)
      await this.uiController.init();

      this.initialized = true;
      console.log('✅ D&D Soundboard initialized successfully!');

    } catch (error) {
      console.error('❌ Failed to initialize D&D Soundboard:', error);
      this.showErrorMessage(error);
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new DnDSoundboard();
    app.init();
  });
} else {
  const app = new DnDSoundboard();
  app.init();
}

// Make app instance available globally for debugging
window.dndSoundboard = new DnDSoundboard();
window.dndSoundboard.init();
