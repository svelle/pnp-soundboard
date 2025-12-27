// Audio Manager - High-level controller for all audio operations

import { generateUUID } from '../utils/helpers.js';
import { DEFAULT_VOLUME } from '../utils/constants.js';

export class AudioManager {
  constructor(audioMixer, soundLibrary) {
    this.audioMixer = audioMixer;
    this.soundLibrary = soundLibrary;

    // Map of active tracks: trackId -> { track, soundId, metadata }
    this.activeTracks = new Map();
  }

  /**
   * Play a sound from the library
   * @param {string} soundId - ID of the sound to play
   * @param {Object} options - Playback options
   * @param {boolean} options.loop - Whether to loop the sound
   * @param {number} options.volume - Initial volume (0-1)
   * @returns {Promise<string>} Track ID
   */
  async playSound(soundId, options = {}) {
    try {
      // Ensure audio context is running
      await this.audioMixer.resume();

      // Get sound from library (includes decoded AudioBuffer)
      const sound = await this.soundLibrary.getSound(soundId);

      // Create track
      const track = this.audioMixer.createTrack(sound.audioBuffer, {
        loop: options.loop || false,
        volume: options.volume !== undefined ? options.volume : DEFAULT_VOLUME
      });

      // Generate track ID
      const trackId = generateUUID();

      // Setup cleanup when track ends (for non-looping sounds)
      track.onEnded(() => {
        this.activeTracks.delete(trackId);
      });

      // Store active track
      this.activeTracks.set(trackId, {
        track: track,
        soundId: soundId,
        metadata: {
          name: sound.name,
          category: sound.category,
          emoji: sound.emoji,
          startedAt: new Date().toISOString()
        }
      });

      // Play the track
      track.play();

      return trackId;
    } catch (error) {
      throw new Error(`Failed to play sound: ${error.message}`);
    }
  }

  /**
   * Stop a specific track
   * @param {string} trackId - ID of the track to stop
   */
  stopTrack(trackId) {
    const activeTrack = this.activeTracks.get(trackId);

    if (activeTrack) {
      activeTrack.track.stop();
      this.activeTracks.delete(trackId);
    }
  }

  /**
   * Stop all tracks for a specific sound
   * @param {string} soundId - ID of the sound
   */
  stopSound(soundId) {
    const tracksToStop = [];

    // Find all tracks playing this sound
    for (const [trackId, activeTrack] of this.activeTracks.entries()) {
      if (activeTrack.soundId === soundId) {
        tracksToStop.push(trackId);
      }
    }

    // Stop all matching tracks
    tracksToStop.forEach(trackId => this.stopTrack(trackId));
  }

  /**
   * Stop all active tracks
   */
  stopAll() {
    for (const [trackId] of this.activeTracks.entries()) {
      this.stopTrack(trackId);
    }
  }

  /**
   * Set volume for a specific track
   * @param {string} trackId - ID of the track
   * @param {number} volume - Volume level (0-1)
   */
  setTrackVolume(trackId, volume) {
    const activeTrack = this.activeTracks.get(trackId);

    if (activeTrack) {
      activeTrack.track.setVolume(volume);
    }
  }

  /**
   * Set loop state for a specific track
   * @param {string} trackId - ID of the track
   * @param {boolean} shouldLoop - Whether to loop
   */
  setTrackLoop(trackId, shouldLoop) {
    const activeTrack = this.activeTracks.get(trackId);

    if (activeTrack) {
      activeTrack.track.setLoop(shouldLoop);
    }
  }

  /**
   * Get all active tracks
   * @returns {Array} Array of active track info
   */
  getActiveTracks() {
    const tracks = [];

    for (const [trackId, activeTrack] of this.activeTracks.entries()) {
      tracks.push({
        trackId: trackId,
        soundId: activeTrack.soundId,
        metadata: activeTrack.metadata,
        volume: activeTrack.track.getVolume(),
        isLooping: activeTrack.track.isLooping(),
        isPlaying: activeTrack.track.isPlaying()
      });
    }

    return tracks;
  }

  /**
   * Get active tracks for a specific sound
   * @param {string} soundId - ID of the sound
   * @returns {Array} Array of track IDs
   */
  getActiveTracksForSound(soundId) {
    const trackIds = [];

    for (const [trackId, activeTrack] of this.activeTracks.entries()) {
      if (activeTrack.soundId === soundId) {
        trackIds.push(trackId);
      }
    }

    return trackIds;
  }

  /**
   * Check if a sound is currently playing
   * @param {string} soundId - ID of the sound
   * @returns {boolean}
   */
  isSoundPlaying(soundId) {
    return this.getActiveTracksForSound(soundId).length > 0;
  }

  /**
   * Get number of active tracks
   * @returns {number}
   */
  getActiveTrackCount() {
    return this.activeTracks.size;
  }

  /**
   * Fade out and stop a track
   * @param {string} trackId - ID of the track
   * @param {number} duration - Fade duration in seconds
   */
  fadeOutAndStop(trackId, duration = 1.0) {
    const activeTrack = this.activeTracks.get(trackId);

    if (activeTrack) {
      activeTrack.track.fadeOut(duration);

      // Stop after fade completes
      setTimeout(() => {
        this.stopTrack(trackId);
      }, duration * 1000);
    }
  }
}
