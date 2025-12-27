// Server Storage - Fetch sounds from backend instead of IndexedDB

import { ALL_PROJECTS } from '../utils/constants.js';

export class ServerStorage {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.baseUrl = window.location.origin;
    this.loadingCache = new Map(); // Track loading sounds
    this.soundCache = new Map(); // Cache for preloaded sounds
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
      // Check if already cached (preloaded)
      if (this.soundCache.has(id)) {
        return this.soundCache.get(id);
      }

      // Check if already loading
      if (this.loadingCache.has(id)) {
        return await this.loadingCache.get(id);
      }

      // Create loading promise
      const loadingPromise = this._loadSound(id, onProgress);
      this.loadingCache.set(id, loadingPromise);

      const result = await loadingPromise;
      this.loadingCache.delete(id);

      // Cache the loaded sound
      this.soundCache.set(id, result);

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
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', options.name || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('category', category);
      formData.append('emoji', options.emoji || '🔊');

      if (options.projectId) {
        formData.append('projectId', options.projectId);
      }

      const response = await fetch(`${this.baseUrl}/api/sounds`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
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
    try {
      const response = await fetch(`${this.baseUrl}/api/sounds/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete sound');
      }
    } catch (error) {
      console.error('Error deleting sound:', error);
      throw error;
    }
  }

  /**
   * Update sound metadata
   * @param {string} id - Sound ID
   * @param {Object} updates - Fields to update (e.g., {name: "New Name"})
   * @returns {Promise<Object>} Updated sound metadata
   */
  async updateSound(id, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/api/sounds/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update sound');
      }

      const soundMeta = await response.json();
      return soundMeta;
    } catch (error) {
      console.error('Error updating sound:', error);
      throw error;
    }
  }

  /**
   * Clear all sounds (not supported in server mode)
   */
  async clearAll() {
    throw new Error('Clear all not supported in server mode');
  }

  // ==================== PROJECT METHODS ====================

  /**
   * Get all projects from server
   * @returns {Promise<Array>} Array of projects
   */
  async getAllProjects() {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects`);

      if (!response.ok) {
        throw new Error('Failed to fetch projects from server');
      }

      const projects = await response.json();
      // Sort by name alphabetically
      return projects.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Get a project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project object
   */
  async getProject(projectId) {
    try {
      const projects = await this.getAllProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      return project;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  /**
   * Create a new project
   * @param {string} name - Project name
   * @returns {Promise<Object>} Created project
   */
  async createProject(name) {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const project = await response.json();
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update a project
   * @param {string} projectId - Project ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      const project = await response.json();
      return project;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  async deleteProject(projectId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Add a sound to a project
   * @param {string} projectId - Project ID
   * @param {string} soundId - Sound ID
   * @returns {Promise<Object>} Updated project
   */
  async addSoundToProject(projectId, soundId) {
    try {
      const project = await this.getProject(projectId);

      // Don't add if already in project
      if (project.soundIds.includes(soundId)) {
        return project;
      }

      project.soundIds.push(soundId);
      return await this.updateProject(projectId, { soundIds: project.soundIds });
    } catch (error) {
      console.error('Error adding sound to project:', error);
      throw error;
    }
  }

  /**
   * Remove a sound from a project
   * @param {string} projectId - Project ID
   * @param {string} soundId - Sound ID
   * @returns {Promise<Object>} Updated project
   */
  async removeSoundFromProject(projectId, soundId) {
    try {
      const project = await this.getProject(projectId);

      project.soundIds = project.soundIds.filter(id => id !== soundId);
      return await this.updateProject(projectId, { soundIds: project.soundIds });
    } catch (error) {
      console.error('Error removing sound from project:', error);
      throw error;
    }
  }

  /**
   * Get all sounds for a project
   * @param {string} projectId - Project ID (use ALL_PROJECTS to get all sounds)
   * @returns {Promise<Array>} Array of sounds in the project
   */
  async getSoundsByProject(projectId) {
    try {
      // Special case: get all sounds
      if (projectId === ALL_PROJECTS) {
        return await this.getAllSounds();
      }

      const project = await this.getProject(projectId);
      const allSounds = await this.getAllSounds();

      // Filter sounds that are in this project
      return allSounds.filter(sound => project.soundIds.includes(sound.id));
    } catch (error) {
      console.error('Error getting sounds by project:', error);
      throw error;
    }
  }

  // ==================== PLAYLIST METHODS ====================

  /**
   * Get all playlists from server
   * @returns {Promise<Array>} Array of playlists
   */
  async getAllPlaylists() {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists`);

      if (!response.ok) {
        throw new Error('Failed to fetch playlists from server');
      }

      const playlists = await response.json();
      // Sort by name alphabetically
      return playlists.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  }

  /**
   * Get a playlist by ID (with tracks)
   * @param {string} playlistId - Playlist ID
   * @returns {Promise<Object>} Playlist object with tracks
   */
  async getPlaylist(playlistId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch playlist from server');
      }

      const playlist = await response.json();

      // Enrich tracks with sound metadata
      if (playlist.tracks && playlist.tracks.length > 0) {
        const allSounds = await this.getAllSounds();
        const soundsMap = new Map(allSounds.map(s => [s.id, s]));

        playlist.tracks = playlist.tracks.map(track => ({
          ...track,
          sound: soundsMap.get(track.soundId) || null
        }));
      }

      return playlist;
    } catch (error) {
      console.error('Error fetching playlist:', error);
      throw error;
    }
  }

  /**
   * Create a new playlist
   * @param {string} name - Playlist name
   * @param {boolean} loop - Whether to loop the playlist
   * @returns {Promise<Object>} Created playlist
   */
  async createPlaylist(name, loop = false) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, loop })
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      const playlist = await response.json();
      return playlist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Update a playlist
   * @param {string} playlistId - Playlist ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated playlist
   */
  async updatePlaylist(playlistId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update playlist');
      }

      const playlist = await response.json();
      return playlist;
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  /**
   * Delete a playlist
   * @param {string} playlistId - Playlist ID
   * @returns {Promise<void>}
   */
  async deletePlaylist(playlistId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  /**
   * Add a track to a playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} soundId - Sound ID
   * @param {Object} options - Track options (volume, pauseMin, pauseMax)
   * @returns {Promise<Object>} Created track
   */
  async addTrackToPlaylist(playlistId, soundId, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          soundId,
          volume: options.volume !== undefined ? options.volume : 0.8,
          pauseMin: options.pauseMin !== undefined ? options.pauseMin : 0,
          pauseMax: options.pauseMax !== undefined ? options.pauseMax : 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add track to playlist');
      }

      const track = await response.json();
      return track;
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      throw error;
    }
  }

  /**
   * Remove a track from a playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} trackId - Track ID
   * @returns {Promise<void>}
   */
  async removeTrackFromPlaylist(playlistId, trackId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove track from playlist');
      }
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      throw error;
    }
  }

  /**
   * Update a playlist track
   * @param {string} playlistId - Playlist ID
   * @param {string} trackId - Track ID
   * @param {Object} updates - Fields to update (volume, pauseMin, pauseMax)
   * @returns {Promise<Object>} Updated track
   */
  async updatePlaylistTrack(playlistId, trackId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update playlist track');
      }

      const track = await response.json();
      return track;
    } catch (error) {
      console.error('Error updating playlist track:', error);
      throw error;
    }
  }

  /**
   * Reorder playlist tracks
   * @param {string} playlistId - Playlist ID
   * @param {Array<string>} trackIds - Array of track IDs in new order
   * @returns {Promise<void>}
   */
  async reorderPlaylistTracks(playlistId, trackIds) {
    try {
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackIds })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder playlist tracks');
      }
    } catch (error) {
      console.error('Error reordering playlist tracks:', error);
      throw error;
    }
  }
}
