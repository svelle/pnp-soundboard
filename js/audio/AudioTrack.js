// Audio Track - Individual audio source with gain control

export class AudioTrack {
  constructor(source, gainNode, context, audioBuffer = null) {
    this.source = source;
    this.gainNode = gainNode;
    this.context = context;
    this.audioBuffer = audioBuffer; // Store for recreating on resume

    this.state = 'stopped'; // 'playing', 'paused', 'stopped'
    this.startTime = 0;
    this.pauseOffset = 0;
    this.originalLoop = false;

    // Event callbacks
    this.onEndedCallback = null;

    // Setup ended event
    this.source.onended = () => {
      if (this.state === 'playing') {
        this.state = 'stopped';
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    };
  }

  /**
   * Play the audio track
   * @param {number} offset - Start time offset in seconds (optional)
   */
  play(offset = 0) {
    if (this.state === 'playing') {
      return; // Already playing
    }

    try {
      this.source.start(0, offset);
      this.startTime = this.context.currentTime - offset;
      this.pauseOffset = offset;
      this.state = 'playing';
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }

  /**
   * Pause the audio track
   * Note: Recreates the source when resuming since AudioBufferSourceNode can't be paused
   */
  pause() {
    if (this.state !== 'playing') {
      return;
    }

    try {
      // Calculate current position
      this.pauseOffset = this.context.currentTime - this.startTime;

      // Stop the source
      this.source.stop();
      this.state = 'paused';
    } catch (error) {
      console.error('Error pausing track:', error);
    }
  }

  /**
   * Resume the audio track from paused position
   * @param {Function} recreateSourceCallback - Callback to recreate source with same settings
   */
  resume(recreateSourceCallback) {
    if (this.state !== 'paused') {
      return;
    }

    try {
      // Need to recreate source through callback since AudioBufferSourceNode can only be used once
      if (recreateSourceCallback) {
        recreateSourceCallback(this.pauseOffset);
      }
    } catch (error) {
      console.error('Error resuming track:', error);
    }
  }

  /**
   * Stop the audio track
   * Note: AudioBufferSourceNode can only be used once
   */
  stop() {
    if (this.state === 'stopped') {
      return;
    }

    try {
      this.source.stop();
      this.state = 'stopped';
    } catch (error) {
      console.error('Error stopping track:', error);
    }
  }

  /**
   * Set track volume
   * @param {number} value - Volume level (0-1)
   */
  setVolume(value) {
    this.gainNode.gain.value = Math.max(0, Math.min(1, value));
  }

  /**
   * Get track volume
   * @returns {number} Current volume (0-1)
   */
  getVolume() {
    return this.gainNode.gain.value;
  }

  /**
   * Set loop state
   * @param {boolean} shouldLoop - Whether to loop
   */
  setLoop(shouldLoop) {
    this.source.loop = shouldLoop;
    this.originalLoop = shouldLoop;
  }

  /**
   * Get loop state
   * @returns {boolean} Whether track is looping
   */
  isLooping() {
    return this.originalLoop || this.source.loop;
  }

  /**
   * Check if track is paused
   * @returns {boolean}
   */
  isPaused() {
    return this.state === 'paused';
  }

  /**
   * Get playback state
   * @returns {string} 'playing' or 'stopped'
   */
  getState() {
    return this.state;
  }

  /**
   * Check if track is playing
   * @returns {boolean}
   */
  isPlaying() {
    return this.state === 'playing';
  }

  /**
   * Get current playback position
   * @returns {number} Position in seconds
   */
  getCurrentTime() {
    if (this.state === 'playing') {
      return this.context.currentTime - this.startTime;
    }
    return this.pauseOffset;
  }

  /**
   * Set callback for when track ends
   * @param {Function} callback - Function to call when track ends
   */
  onEnded(callback) {
    this.onEndedCallback = callback;
  }

  /**
   * Fade volume in
   * @param {number} duration - Fade duration in seconds
   */
  fadeIn(duration = 1.0) {
    const currentVolume = this.gainNode.gain.value;
    this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(currentVolume, this.context.currentTime + duration);
  }

  /**
   * Fade volume out
   * @param {number} duration - Fade duration in seconds
   */
  fadeOut(duration = 1.0) {
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.context.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);
  }
}
