// Sound Library - High-level API for managing sounds

import { SOUNDS_STORE, CATEGORIES } from '../utils/constants.js';
import { generateUUID, sanitizeFilename } from '../utils/helpers.js';

export class SoundLibrary {
  constructor(dbManager, audioContext) {
    this.dbManager = dbManager;
    this.audioContext = audioContext;
  }

  /**
   * Add a new sound to the library
   * @param {File} file - Audio file
   * @param {string} category - Sound category (sfx, music, ambience)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Added sound object
   */
  async addSound(file, category = CATEGORIES.SFX, options = {}) {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await this._readFileAsArrayBuffer(file);

      // Decode audio to get duration
      let duration = 0;
      try {
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        duration = audioBuffer.duration;
      } catch (err) {
        console.warn('Could not decode audio for duration:', err);
      }

      // Create sound object
      const sound = {
        id: generateUUID(),
        name: options.name || sanitizeFilename(file.name),
        category: category,
        audioData: arrayBuffer,
        fileType: file.type,
        fileSize: file.size,
        duration: duration,
        dateAdded: new Date().toISOString(),
        emoji: options.emoji || this._getDefaultEmoji(category)
      };

      // Store in IndexedDB
      await this.dbManager.add(SOUNDS_STORE, sound);

      return sound;
    } catch (error) {
      throw new Error(`Failed to add sound: ${error.message}`);
    }
  }

  /**
   * Get a sound by ID and decode it to AudioBuffer
   * @param {string} id - Sound ID
   * @returns {Promise<Object>} Object with sound metadata and AudioBuffer
   */
  async getSound(id) {
    try {
      const sound = await this.dbManager.get(SOUNDS_STORE, id);

      if (!sound) {
        throw new Error('Sound not found');
      }

      // Decode audio data to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(sound.audioData.slice(0));

      return {
        ...sound,
        audioBuffer: audioBuffer
      };
    } catch (error) {
      throw new Error(`Failed to get sound: ${error.message}`);
    }
  }

  /**
   * Get all sounds
   * @returns {Promise<Array>} Array of all sounds (without AudioBuffer)
   */
  async getAllSounds() {
    try {
      return await this.dbManager.getAll(SOUNDS_STORE);
    } catch (error) {
      throw new Error(`Failed to get all sounds: ${error.message}`);
    }
  }

  /**
   * Get sounds by category
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>} Array of sounds in category
   */
  async getSoundsByCategory(category) {
    try {
      return await this.dbManager.getAllByIndex(SOUNDS_STORE, 'category', category);
    } catch (error) {
      throw new Error(`Failed to get sounds by category: ${error.message}`);
    }
  }

  /**
   * Update sound metadata
   * @param {string} id - Sound ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated sound
   */
  async updateSound(id, updates) {
    try {
      const sound = await this.dbManager.get(SOUNDS_STORE, id);

      if (!sound) {
        throw new Error('Sound not found');
      }

      const updatedSound = {
        ...sound,
        ...updates,
        id: sound.id // Ensure ID doesn't change
      };

      await this.dbManager.update(SOUNDS_STORE, updatedSound);

      return updatedSound;
    } catch (error) {
      throw new Error(`Failed to update sound: ${error.message}`);
    }
  }

  /**
   * Delete a sound
   * @param {string} id - Sound ID
   * @returns {Promise<void>}
   */
  async deleteSound(id) {
    try {
      await this.dbManager.delete(SOUNDS_STORE, id);
    } catch (error) {
      throw new Error(`Failed to delete sound: ${error.message}`);
    }
  }

  /**
   * Clear all sounds
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await this.dbManager.clear(SOUNDS_STORE);
    } catch (error) {
      throw new Error(`Failed to clear sounds: ${error.message}`);
    }
  }

  /**
   * Read file as ArrayBuffer
   * @private
   * @param {File} file - File to read
   * @returns {Promise<ArrayBuffer>}
   */
  _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get default emoji for category
   * @private
   * @param {string} category - Sound category
   * @returns {string} Emoji
   */
  _getDefaultEmoji(category) {
    const emojiMap = {
      [CATEGORIES.SFX]: '🔊',
      [CATEGORIES.MUSIC]: '🎵',
      [CATEGORIES.AMBIENCE]: '🌊'
    };
    return emojiMap[category] || '🔊';
  }
}
