// UI Controller - Main UI coordinator

import { UploadManager } from './UploadManager.js';
import { VolumeControls } from './VolumeControls.js';
import { SoundBoard } from './SoundBoard.js';

export class UIController {
  constructor(audioMixer, audioManager, soundLibrary, mode = 'local', passwordHandler = null) {
    this.audioMixer = audioMixer;
    this.audioManager = audioManager;
    this.soundLibrary = soundLibrary;
    this.mode = mode;
    this.passwordHandler = passwordHandler;

    // Initialize UI components
    this.volumeControls = new VolumeControls(this.audioMixer);

    this.soundBoard = new SoundBoard(
      this.audioManager,
      this.soundLibrary,
      this.volumeControls
    );

    this.uploadManager = new UploadManager(
      this.soundLibrary,
      (sound) => this.handleUploadComplete(sound),
      this.mode,
      this.passwordHandler
    );
  }

  /**
   * Initialize the UI
   */
  async init() {
    try {
      // Load existing sounds
      await this.soundBoard.loadSounds();

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

    } catch (error) {
      console.error('Error initializing UI:', error);
    }
  }

  /**
   * Handle upload complete
   * @param {Object} sound - Uploaded sound data
   */
  handleUploadComplete(sound) {
    // Add sound card to board
    this.soundBoard.addSound(sound);
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Space or Enter = Stop all
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.soundBoard.stopAll();
      }

      // U = Upload
      if (e.code === 'KeyU') {
        e.preventDefault();
        document.getElementById('uploadBtn').click();
      }

      // Numbers 1-9 for quick play (future enhancement)
      // if (e.code.startsWith('Digit')) {
      //   const num = parseInt(e.code.replace('Digit', ''));
      //   // Play sound by index
      // }
    });
  }

  /**
   * Show notification (future enhancement)
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Future: Implement toast notifications
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}
