// Sound Library - High-level API for managing sounds

import { SOUNDS_STORE, CATEGORIES, PROJECTS_STORE, ALL_PROJECTS, DEFAULT_PROJECT_ID } from '../utils/constants.js';
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

  // ==================== PROJECT METHODS ====================

  /**
   * Create a new project
   * @param {string} name - Project name
   * @returns {Promise<Object>} Created project
   */
  async createProject(name) {
    try {
      const project = {
        id: generateUUID(),
        name: name,
        soundIds: [],
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      await this.dbManager.add(PROJECTS_STORE, project);
      return project;
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get a project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project object
   */
  async getProject(projectId) {
    try {
      const project = await this.dbManager.get(PROJECTS_STORE, projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      return project;
    } catch (error) {
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  /**
   * Get all projects, sorted by name
   * @returns {Promise<Array>} Array of all projects
   */
  async getAllProjects() {
    try {
      const projects = await this.dbManager.getAll(PROJECTS_STORE);
      // Sort by name alphabetically
      return projects.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error(`Failed to get all projects: ${error.message}`);
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
      const project = await this.dbManager.get(PROJECTS_STORE, projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const updatedProject = {
        ...project,
        ...updates,
        id: project.id, // Ensure ID doesn't change
        lastModified: new Date().toISOString()
      };

      await this.dbManager.update(PROJECTS_STORE, updatedProject);
      return updatedProject;
    } catch (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  async deleteProject(projectId) {
    try {
      // Prevent deleting last project
      const allProjects = await this.getAllProjects();
      if (allProjects.length <= 1) {
        throw new Error('Cannot delete the last project');
      }

      await this.dbManager.delete(PROJECTS_STORE, projectId);
    } catch (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
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
      throw new Error(`Failed to add sound to project: ${error.message}`);
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
      throw new Error(`Failed to remove sound from project: ${error.message}`);
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
      throw new Error(`Failed to get sounds by project: ${error.message}`);
    }
  }
}
