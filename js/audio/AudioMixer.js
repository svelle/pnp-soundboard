// Audio Mixer - Web Audio API context and master gain management

import { DEFAULT_MASTER_VOLUME } from '../utils/constants.js';
import { AudioTrack } from './AudioTrack.js';

export class AudioMixer {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.initialized = false;
  }

  /**
   * Initialize the Audio Context and master gain node
   * Note: Must be called after user interaction on mobile browsers
   */
  init() {
    if (this.initialized) {
      return;
    }

    // Create AudioContext (with vendor prefix support)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext();

    // Create master gain node
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = DEFAULT_MASTER_VOLUME;

    // Connect master gain to destination (speakers)
    this.masterGain.connect(this.context.destination);

    this.initialized = true;
  }

  /**
   * Resume audio context (required on mobile browsers)
   * @returns {Promise<void>}
   */
  async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Create a new audio track
   * @param {AudioBuffer} audioBuffer - Decoded audio buffer
   * @param {Object} options - Track options
   * @param {boolean} options.loop - Whether to loop the audio
   * @param {number} options.volume - Initial volume (0-1)
   * @returns {AudioTrack} New audio track instance
   */
  createTrack(audioBuffer, options = {}) {
    if (!this.initialized) {
      throw new Error('AudioMixer not initialized. Call init() first.');
    }

    const source = this.context.createBufferSource();
    const gainNode = this.context.createGain();

    source.buffer = audioBuffer;
    source.loop = options.loop || false;
    gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;

    // Connect: source -> gain -> master -> destination
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    return new AudioTrack(source, gainNode, this.context);
  }

  /**
   * Set master volume
   * @param {number} value - Volume level (0-1)
   */
  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Get master volume
   * @returns {number} Current master volume (0-1)
   */
  getMasterVolume() {
    return this.masterGain ? this.masterGain.gain.value : 0;
  }

  /**
   * Get audio context state
   * @returns {string} 'running', 'suspended', or 'closed'
   */
  getState() {
    return this.context ? this.context.state : 'closed';
  }

  /**
   * Get current time from audio context
   * @returns {number} Current time in seconds
   */
  getCurrentTime() {
    return this.context ? this.context.currentTime : 0;
  }
}
