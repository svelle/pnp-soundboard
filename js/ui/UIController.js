// UI Controller - Main UI coordinator

import { UploadManager } from './UploadManager.js';
import { VolumeControls } from './VolumeControls.js';
import { SoundBoard } from './SoundBoard.js';
import { ProjectManager } from './ProjectManager.js';
import { RenameManager } from './RenameManager.js';
import { ProjectAssignmentManager } from './ProjectAssignmentManager.js';
import { PlaylistManager } from './PlaylistManager.js';
import { PlaylistBuilder } from './PlaylistBuilder.js';
import { PlaylistPlayer } from './PlaylistPlayer.js';
import { PlaylistAssignmentManager } from './PlaylistAssignmentManager.js';

export class UIController {
  constructor(audioMixer, audioManager, soundLibrary, mode = 'local') {
    this.audioMixer = audioMixer;
    this.audioManager = audioManager;
    this.soundLibrary = soundLibrary;
    this.mode = mode;

    // Initialize UI components
    this.volumeControls = new VolumeControls(this.audioMixer);

    this.soundBoard = new SoundBoard(
      this.audioManager,
      this.soundLibrary,
      this.volumeControls
    );

    this.projectManager = new ProjectManager(
      this.soundLibrary,
      (projectId) => this.handleProjectChanged(projectId)
    );

    this.uploadManager = new UploadManager(
      this.soundLibrary,
      (sound) => this.handleUploadComplete(sound),
      this.mode,
      this.projectManager
    );

    this.renameManager = new RenameManager(
      this.soundLibrary,
      (soundId, newName) => this.handleRenameComplete(soundId, newName)
    );

    this.projectAssignmentManager = new ProjectAssignmentManager(
      this.soundLibrary,
      (soundId) => this.handleProjectAssignmentComplete(soundId)
    );

    // Initialize playlist components
    this.playlistBuilder = new PlaylistBuilder(this.soundLibrary);

    this.playlistManager = new PlaylistManager(
      this.soundLibrary,
      this.audioManager,
      (playlistId) => this.playlistBuilder.openBuilder(playlistId)
    );

    this.playlistPlayer = new PlaylistPlayer(this.audioManager);

    this.playlistAssignmentManager = new PlaylistAssignmentManager(
      this.soundLibrary,
      (soundId) => this.handlePlaylistAssignmentComplete(soundId)
    );

    // Wire up managers to sound board
    this.soundBoard.setRenameManager(this.renameManager);
    this.soundBoard.setProjectAssignmentManager(this.projectAssignmentManager);
    this.soundBoard.setPlaylistAssignmentManager(this.playlistAssignmentManager);
  }

  /**
   * Initialize the UI
   */
  async init() {
    try {
      // Load existing sounds for current project
      const currentProjectId = this.projectManager.getCurrentProjectId();
      await this.soundBoard.loadSounds(currentProjectId);

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

    } catch (error) {
      console.error('Error initializing UI:', error);
    }
  }

  /**
   * Handle project change
   * @param {string} projectId - New project ID
   */
  async handleProjectChanged(projectId) {
    try {
      // Stop all currently playing sounds
      this.audioManager.stopAll();

      // Reload sounds for the selected project
      await this.soundBoard.loadSounds(projectId);
    } catch (error) {
      console.error('Error changing project:', error);
    }
  }

  /**
   * Handle upload complete
   * @param {Object} sound - Uploaded sound data
   */
  async handleUploadComplete(sound) {
    // Reload sounds to reflect the new upload
    const currentProjectId = this.projectManager.getCurrentProjectId();
    await this.soundBoard.loadSounds(currentProjectId);
  }

  /**
   * Handle rename complete
   * @param {string} soundId - Sound ID
   * @param {string} newName - New sound name
   */
  handleRenameComplete(soundId, newName) {
    // Update the sound name in the UI
    this.soundBoard.updateSoundName(soundId, newName);
  }

  /**
   * Handle project assignment complete
   * @param {string} soundId - Sound ID
   */
  async handleProjectAssignmentComplete(soundId) {
    // If we're viewing a specific project (not "All Projects"),
    // reload to reflect changes
    const currentProjectId = this.projectManager.getCurrentProjectId();
    if (currentProjectId !== 'ALL_PROJECTS') {
      // Reload sounds for current project
      await this.soundBoard.loadSounds(currentProjectId);
    }
  }

  /**
   * Handle playlist assignment complete
   * @param {string} soundId - Sound ID
   */
  async handlePlaylistAssignmentComplete(soundId) {
    // Refresh playlist manager to show updated track counts
    if (this.playlistManager) {
      await this.playlistManager.refresh();
    }
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
