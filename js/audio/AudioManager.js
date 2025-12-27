// Audio Manager - High-level controller for all audio operations

import { generateUUID } from '../utils/helpers.js';
import { DEFAULT_VOLUME } from '../utils/constants.js';

export class AudioManager {
  constructor(audioMixer, soundLibrary) {
    this.audioMixer = audioMixer;
    this.soundLibrary = soundLibrary;

    // Map of active tracks: trackId -> { track, soundId, metadata }
    this.activeTracks = new Map();

    // Playlist playback state
    this.currentPlaylist = null; // { playlistId, playlist, currentTrackIndex, currentTrackId, nextTrackTimeout }
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
   * Pause a specific track
   * @param {string} trackId - ID of the track to pause
   */
  pauseTrack(trackId) {
    const activeTrack = this.activeTracks.get(trackId);

    if (activeTrack && activeTrack.track.isPlaying()) {
      activeTrack.track.pause();
    }
  }

  /**
   * Resume a paused track
   * @param {string} trackId - ID of the track to resume
   */
  async resumeTrack(trackId) {
    const activeTrack = this.activeTracks.get(trackId);

    if (activeTrack && activeTrack.track.isPaused()) {
      await this.audioMixer.resume();

      const pauseOffset = activeTrack.track.pauseOffset;
      const currentVolume = activeTrack.track.getVolume();
      const isLooping = activeTrack.track.isLooping();

      // Create new track from same audio buffer
      const newTrack = this.audioMixer.createTrack(activeTrack.audioBuffer, {
        loop: isLooping,
        volume: currentVolume
      });

      // Setup ended callback
      newTrack.onEnded(() => {
        if (activeTrack.loopSettings && activeTrack.loopSettings.hasPauseInterval && this.activeTracks.has(trackId)) {
          this._scheduleLoopRestart(trackId, activeTrack.audioBuffer, {
            loop: true,
            pauseMin: activeTrack.loopSettings.pauseMin,
            pauseMax: activeTrack.loopSettings.pauseMax
          });
        } else if (!isLooping) {
          this.activeTracks.delete(trackId);
        }
      });

      // Replace track reference
      activeTrack.track = newTrack;

      // Play from pause offset
      newTrack.play(pauseOffset);
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
   * Stop all active tracks and playlists
   */
  stopAll() {
    // Stop playlist if playing
    if (this.currentPlaylist) {
      this.stopPlaylist();
    }

    // Stop all individual tracks
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
        track: activeTrack.track, // Include track reference for pause/resume
        volume: activeTrack.track.getVolume(),
        isLooping: activeTrack.track.isLooping(),
        isPlaying: activeTrack.track.isPlaying(),
        isPaused: activeTrack.track.isPaused()
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

  // ==================== Playlist Playback Methods ====================

  /**
   * Play a playlist from the library
   * @param {string} playlistId - ID of the playlist to play
   * @param {Object} options - Playback options
   * @param {number} options.startIndex - Track index to start from (default: 0)
   * @returns {Promise<string>} Playlist playback ID
   */
  async playPlaylist(playlistId, options = {}) {
    try {
      // Stop any currently playing playlist
      if (this.currentPlaylist) {
        this.stopPlaylist();
      }

      // Load playlist with all tracks and sound metadata
      const playlist = await this.soundLibrary.getPlaylist(playlistId);

      if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
        throw new Error('Playlist is empty or not found');
      }

      // Initialize playlist state
      this.currentPlaylist = {
        playlistId: playlistId,
        playlist: playlist,
        currentTrackIndex: options.startIndex || 0,
        currentTrackId: null,
        nextTrackTimeout: null
      };

      // Start playing first track
      await this._playPlaylistTrack(this.currentPlaylist.currentTrackIndex);

      return playlistId;
    } catch (error) {
      this.currentPlaylist = null;
      throw new Error(`Failed to play playlist: ${error.message}`);
    }
  }

  /**
   * Play a specific track in the current playlist
   * @private
   * @param {number} trackIndex - Index of track to play
   */
  async _playPlaylistTrack(trackIndex) {
    if (!this.currentPlaylist) return;

    const playlist = this.currentPlaylist.playlist;
    const tracks = playlist.tracks;

    // Validate track index
    if (trackIndex < 0 || trackIndex >= tracks.length) {
      console.warn(`Invalid track index: ${trackIndex}`);
      return;
    }

    const track = tracks[trackIndex];

    // Skip tracks with missing sounds
    if (!track.sound) {
      console.warn(`Sound not found for track ${track.id}, skipping to next`);
      this._scheduleNextTrack(trackIndex);
      return;
    }

    try {
      // Ensure audio context is running
      await this.audioMixer.resume();

      // Play the sound with track-specific volume
      const trackId = await this.playSound(track.soundId, {
        loop: false, // Playlist handles sequencing, not looping
        volume: track.volume
      });

      // Update current track reference
      this.currentPlaylist.currentTrackId = trackId;
      this.currentPlaylist.currentTrackIndex = trackIndex;

      // Get the active track and override its onEnded callback
      const activeTrack = this.activeTracks.get(trackId);
      if (activeTrack) {
        // Replace the onEnded callback to schedule next track
        activeTrack.track.onEnded(() => {
          // Clean up this track
          this.activeTracks.delete(trackId);

          // Schedule next track if playlist is still active
          if (this.currentPlaylist && this.currentPlaylist.currentTrackId === trackId) {
            this._scheduleNextTrack(trackIndex);
          }
        });
      }
    } catch (error) {
      console.error(`Error playing playlist track ${trackIndex}:`, error);
      // Try to continue to next track
      this._scheduleNextTrack(trackIndex);
    }
  }

  /**
   * Schedule the next track in the playlist after pause interval
   * @private
   * @param {number} currentIndex - Index of track that just finished
   */
  _scheduleNextTrack(currentIndex) {
    if (!this.currentPlaylist) return;

    const playlist = this.currentPlaylist.playlist;
    const tracks = playlist.tracks;
    const currentTrack = tracks[currentIndex];

    // Calculate pause duration
    const pauseMin = currentTrack.pauseMin || 0;
    const pauseMax = currentTrack.pauseMax || 0;
    const pauseDuration = pauseMin + Math.random() * (pauseMax - pauseMin);

    // Clear any existing timeout
    if (this.currentPlaylist.nextTrackTimeout) {
      clearTimeout(this.currentPlaylist.nextTrackTimeout);
    }

    // Schedule next track
    this.currentPlaylist.nextTrackTimeout = setTimeout(async () => {
      if (!this.currentPlaylist) return;

      const nextIndex = currentIndex + 1;

      // Check if we've reached the end
      if (nextIndex >= tracks.length) {
        // Handle playlist end
        if (playlist.loop) {
          // Loop back to first track
          await this._playPlaylistTrack(0);
        } else {
          // Playlist finished
          this.currentPlaylist = null;
        }
      } else {
        // Play next track
        await this._playPlaylistTrack(nextIndex);
      }
    }, pauseDuration * 1000);
  }

  /**
   * Stop the currently playing playlist
   */
  stopPlaylist() {
    if (!this.currentPlaylist) return;

    // Clear any scheduled next track
    if (this.currentPlaylist.nextTrackTimeout) {
      clearTimeout(this.currentPlaylist.nextTrackTimeout);
    }

    // Stop current track if playing
    if (this.currentPlaylist.currentTrackId) {
      this.stopTrack(this.currentPlaylist.currentTrackId);
    }

    // Clear playlist state
    this.currentPlaylist = null;
  }

  /**
   * Pause the current playlist track
   */
  pausePlaylist() {
    if (!this.currentPlaylist || !this.currentPlaylist.currentTrackId) return;

    this.pauseTrack(this.currentPlaylist.currentTrackId);
  }

  /**
   * Resume the current playlist track
   */
  async resumePlaylist() {
    if (!this.currentPlaylist || !this.currentPlaylist.currentTrackId) return;

    await this.resumeTrack(this.currentPlaylist.currentTrackId);
  }

  /**
   * Skip to the next track in the playlist
   */
  async skipToNextTrack() {
    if (!this.currentPlaylist) return;

    const playlist = this.currentPlaylist.playlist;
    const currentIndex = this.currentPlaylist.currentTrackIndex;
    const nextIndex = currentIndex + 1;

    // Clear any scheduled next track
    if (this.currentPlaylist.nextTrackTimeout) {
      clearTimeout(this.currentPlaylist.nextTrackTimeout);
    }

    // Stop current track
    if (this.currentPlaylist.currentTrackId) {
      this.stopTrack(this.currentPlaylist.currentTrackId);
    }

    // Check if we've reached the end
    if (nextIndex >= playlist.tracks.length) {
      if (playlist.loop) {
        // Loop back to first track
        await this._playPlaylistTrack(0);
      } else {
        // Reached end of non-looping playlist
        this.currentPlaylist = null;
      }
    } else {
      // Play next track immediately
      await this._playPlaylistTrack(nextIndex);
    }
  }

  /**
   * Skip to the previous track in the playlist
   */
  async skipToPreviousTrack() {
    if (!this.currentPlaylist) return;

    const playlist = this.currentPlaylist.playlist;
    const currentIndex = this.currentPlaylist.currentTrackIndex;
    const previousIndex = currentIndex - 1;

    // Clear any scheduled next track
    if (this.currentPlaylist.nextTrackTimeout) {
      clearTimeout(this.currentPlaylist.nextTrackTimeout);
    }

    // Stop current track
    if (this.currentPlaylist.currentTrackId) {
      this.stopTrack(this.currentPlaylist.currentTrackId);
    }

    // Check if we're at the beginning
    if (previousIndex < 0) {
      if (playlist.loop) {
        // Loop to last track
        await this._playPlaylistTrack(playlist.tracks.length - 1);
      } else {
        // Stay at first track
        await this._playPlaylistTrack(0);
      }
    } else {
      // Play previous track immediately
      await this._playPlaylistTrack(previousIndex);
    }
  }

  /**
   * Skip to a specific track in the playlist
   * @param {number} trackIndex - Index of track to play
   */
  async skipToTrack(trackIndex) {
    if (!this.currentPlaylist) return;

    const playlist = this.currentPlaylist.playlist;

    // Validate index
    if (trackIndex < 0 || trackIndex >= playlist.tracks.length) {
      console.warn(`Invalid track index: ${trackIndex}`);
      return;
    }

    // Clear any scheduled next track
    if (this.currentPlaylist.nextTrackTimeout) {
      clearTimeout(this.currentPlaylist.nextTrackTimeout);
    }

    // Stop current track
    if (this.currentPlaylist.currentTrackId) {
      this.stopTrack(this.currentPlaylist.currentTrackId);
    }

    // Play specified track immediately
    await this._playPlaylistTrack(trackIndex);
  }

  /**
   * Get current playlist playback state
   * @returns {Object|null} Playlist state or null if no playlist playing
   */
  getCurrentPlaylistState() {
    if (!this.currentPlaylist) return null;

    const playlist = this.currentPlaylist.playlist;
    const currentTrack = playlist.tracks[this.currentPlaylist.currentTrackIndex];

    return {
      playlistId: this.currentPlaylist.playlistId,
      playlistName: playlist.name,
      loop: playlist.loop,
      currentTrackIndex: this.currentPlaylist.currentTrackIndex,
      totalTracks: playlist.tracks.length,
      currentTrack: currentTrack ? {
        id: currentTrack.id,
        soundId: currentTrack.soundId,
        soundName: currentTrack.sound ? currentTrack.sound.name : 'Unknown',
        volume: currentTrack.volume
      } : null,
      isPlaying: this.currentPlaylist.currentTrackId ?
        this.activeTracks.has(this.currentPlaylist.currentTrackId) : false
    };
  }

  /**
   * Check if a playlist is currently playing
   * @returns {boolean}
   */
  isPlaylistPlaying() {
    return this.currentPlaylist !== null;
  }
}
