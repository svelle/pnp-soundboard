// Server Storage - Fetch sounds from backend instead of IndexedDB

export class ServerStorage {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.baseUrl = window.location.origin;
    this.authCredentials = null;
    this.loadingCache = new Map(); // Track loading sounds
  }

  /**
   * Set authentication credentials for uploads/deletes
   * @param {string} username - Username (default: 'admin')
   * @param {string} password - Password
   */
  setAuth(username, password) {
    this.authCredentials = btoa(`${username}:${password}`);
  }

  /**
   * Get all sounds from server
   * @returns {Promise<Array>} Array of sound metadata
   */
  async getAllSounds() {
    try {
      const response = await fetch(`${this.baseUrl}/api/sounds`);

      if (!response.ok) {
        throw new Error('Failed to fetch sounds from server');
      }

      const sounds = await response.json();
      return sounds;
    } catch (error) {
      console.error('Error fetching sounds:', error);
      throw error;
    }
  }

  /**
   * Get sounds by category
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>} Array of sounds in category
   */
  async getSoundsByCategory(category) {
    const allSounds = await this.getAllSounds();
    return allSounds.filter(s => s.category === category);
  }

  /**
   * Get a sound by ID and load its audio buffer
   * @param {string} id - Sound ID
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<Object>} Sound with audioBuffer
   */
  async getSound(id, onProgress = null) {
    try {
      // Check if already loading
      if (this.loadingCache.has(id)) {
        return await this.loadingCache.get(id);
      }

      // Create loading promise
      const loadingPromise = this._loadSound(id, onProgress);
      this.loadingCache.set(id, loadingPromise);

      const result = await loadingPromise;
      this.loadingCache.delete(id);

      return result;
    } catch (error) {
      this.loadingCache.delete(id);
      throw error;
    }
  }

  /**
   * Internal method to load sound
   * @private
   */
  async _loadSound(id, onProgress) {
    // First get metadata
    const allSounds = await this.getAllSounds();
    const soundMeta = allSounds.find(s => s.id === id);

    if (!soundMeta) {
      throw new Error('Sound not found');
    }

    // Fetch audio file
    const response = await fetch(`${this.baseUrl}/api/sounds/${id}/file`);

    if (!response.ok) {
      throw new Error('Failed to fetch sound file');
    }

    // Get file size for progress tracking
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);

    if (!response.body) {
      // Fallback for browsers that don't support ReadableStream
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      return {
        ...soundMeta,
        duration: audioBuffer.duration,
        audioBuffer: audioBuffer
      };
    }

    // Read with progress tracking
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (onProgress && total) {
        onProgress(loaded, total);
      }
    }

    // Combine chunks
    const arrayBuffer = new Uint8Array(loaded);
    let position = 0;

    for (const chunk of chunks) {
      arrayBuffer.set(chunk, position);
      position += chunk.length;
    }

    // Decode audio
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.buffer);

    return {
      ...soundMeta,
      duration: audioBuffer.duration,
      audioBuffer: audioBuffer
    };
  }

  /**
   * Pre-load all sounds in background
   * @param {Function} onSoundLoaded - Callback for each sound loaded (soundId, progress)
   * @returns {Promise<Map>} Map of soundId -> sound with audioBuffer
   */
  async preloadAllSounds(onSoundLoaded = null) {
    const allSounds = await this.getAllSounds();
    const loadedSounds = new Map();

    // Load sounds in parallel (limit concurrency to avoid overwhelming the server)
    const concurrency = 3;
    const chunks = [];

    for (let i = 0; i < allSounds.length; i += concurrency) {
      chunks.push(allSounds.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (soundMeta) => {
          try {
            const sound = await this.getSound(soundMeta.id, (loaded, total) => {
              if (onSoundLoaded) {
                onSoundLoaded(soundMeta.id, 'loading', loaded / total);
              }
            });

            loadedSounds.set(soundMeta.id, sound);

            if (onSoundLoaded) {
              onSoundLoaded(soundMeta.id, 'ready', 1);
            }
          } catch (error) {
            console.error(`Failed to load sound ${soundMeta.id}:`, error);
            if (onSoundLoaded) {
              onSoundLoaded(soundMeta.id, 'error', 0);
            }
          }
        })
      );
    }

    return loadedSounds;
  }

  /**
   * Add a new sound (upload to server)
   * @param {File} file - Audio file
   * @param {string} category - Sound category
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Added sound metadata
   */
  async addSound(file, category, options = {}) {
    if (!this.authCredentials) {
      throw new Error('Authentication required for uploading sounds');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', options.name || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('category', category);
      formData.append('emoji', options.emoji || '🔊');

      const response = await fetch(`${this.baseUrl}/api/sounds`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.authCredentials}`
        },
        body: formData
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid password');
        }
        throw new Error('Failed to upload sound');
      }

      const soundMeta = await response.json();
      return soundMeta;
    } catch (error) {
      console.error('Error uploading sound:', error);
      throw error;
    }
  }

  /**
   * Delete a sound
   * @param {string} id - Sound ID
   * @returns {Promise<void>}
   */
  async deleteSound(id) {
    if (!this.authCredentials) {
      throw new Error('Authentication required for deleting sounds');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/sounds/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${this.authCredentials}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid password');
        }
        throw new Error('Failed to delete sound');
      }
    } catch (error) {
      console.error('Error deleting sound:', error);
      throw error;
    }
  }

  /**
   * Update sound metadata (not supported in server mode currently)
   */
  async updateSound(id, updates) {
    throw new Error('Update not supported in server mode');
  }

  /**
   * Clear all sounds (not supported in server mode)
   */
  async clearAll() {
    throw new Error('Clear all not supported in server mode');
  }
}
