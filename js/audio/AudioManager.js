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
   * @param {number} options.pauseMin - Minimum pause between loops in seconds (optional)
   * @param {number} options.pauseMax - Maximum pause between loops in seconds (optional)
   * @returns {Promise<string>} Track ID
   */
  async playSound(soundId, options = {}) {
    try {
      // Ensure audio context is running
      await this.audioMixer.resume();

      // Get sound from library (includes decoded AudioBuffer)
      const sound = await this.soundLibrary.getSound(soundId);

      const trackId = generateUUID();
      const shouldLoop = options.loop || false;
      const hasPauseInterval = shouldLoop && options.pauseMin !== undefined && options.pauseMax !== undefined;

      // If looping with pause intervals, disable native loop and handle manually
      const useNativeLoop = shouldLoop && !hasPauseInterval;

      // Create track
      const track = this.audioMixer.createTrack(sound.audioBuffer, {
        loop: useNativeLoop,
        volume: options.volume !== undefined ? options.volume : DEFAULT_VOLUME
      });

      // Store active track info
      const trackInfo = {
        track: track,
        soundId: soundId,
        audioBuffer: sound.audioBuffer,
        loopSettings: {
          enabled: shouldLoop,
          pauseMin: options.pauseMin,
          pauseMax: options.pauseMax,
          hasPauseInterval: hasPauseInterval
        },
        metadata: {
          name: sound.name,
          category: sound.category,
          emoji: sound.emoji,
          startedAt: new Date().toISOString()
        }
      };

      this.activeTracks.set(trackId, trackInfo);

      // Setup cleanup/restart when track ends
      track.onEnded(() => {
        if (hasPauseInterval && this.activeTracks.has(trackId)) {
          // Schedule restart after random pause
          this._scheduleLoopRestart(trackId, sound.audioBuffer, options);
        } else if (!useNativeLoop) {
          // Clean up non-looping tracks
          this.activeTracks.delete(trackId);
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
   * Schedule a loop restart after random pause interval
   * @private
   * @param {string} trackId - Track ID
   * @param {AudioBuffer} audioBuffer - Audio buffer to play
   * @param {Object} options - Original playback options
   */
  async _scheduleLoopRestart(trackId, audioBuffer, options) {
    const trackInfo = this.activeTracks.get(trackId);
    if (!trackInfo) return;

    // Calculate random pause duration
    const pauseMin = options.pauseMin || 0;
    const pauseMax = options.pauseMax || 0;
    const pauseDuration = pauseMin + Math.random() * (pauseMax - pauseMin);

    // Store timeout reference for cleanup
    trackInfo.pauseTimeout = setTimeout(async () => {
      // Check if track was stopped during pause
      if (!this.activeTracks.has(trackId)) return;

      try {
        await this.audioMixer.resume();

        // Create new source (AudioBufferSourceNode can only be used once)
        const newTrack = this.audioMixer.createTrack(audioBuffer, {
          loop: false, // We handle looping manually
          volume: trackInfo.track.getVolume()
        });

        // Update track reference
        trackInfo.track = newTrack;

        // Setup ended callback for next iteration
        newTrack.onEnded(() => {
          if (this.activeTracks.has(trackId)) {
            this._scheduleLoopRestart(trackId, audioBuffer, options);
          }
        });

        // Play
        newTrack.play();

      } catch (error) {
        console.error('Error restarting loop:', error);
        this.activeTracks.delete(trackId);
      }
    }, pauseDuration * 1000);
  }

  /**
   * Stop a specific track
   * @param {string} trackId - ID of the track to stop
   */
  stopTrack(trackId) {
    const activeTrack = this.activeTracks.get(trackId);

    if (activeTrack) {
      // Clear any pending pause timeout
      if (activeTrack.pauseTimeout) {
        clearTimeout(activeTrack.pauseTimeout);
      }

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
