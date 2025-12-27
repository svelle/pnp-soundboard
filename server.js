// Express server for D&D Soundboard
// Supports server-side storage

import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import cors from 'cors';
import { parseFile } from 'music-metadata';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SOUNDS_DIR = path.join(__dirname, 'sounds');
const METADATA_FILE = path.join(__dirname, 'sounds', 'metadata.json');

// Ensure sounds directory exists
if (!fsSync.existsSync(SOUNDS_DIR)) {
  fsSync.mkdirSync(SOUNDS_DIR, { recursive: true });
}

// Initialize metadata file if it doesn't exist
if (!fsSync.existsSync(METADATA_FILE)) {
  const defaultMetadata = {
    sounds: [],
    projects: [
      {
        id: 'default',
        name: 'Default Project',
        soundIds: [],
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    ]
  };
  fsSync.writeFileSync(METADATA_FILE, JSON.stringify(defaultMetadata, null, 2));
}

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SOUNDS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `sound-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    // IMPORTANT: Keep in sync with:
    // - js/utils/constants.js (MAX_FILE_SIZE)
    // - nginx/conf.d/soundboard.conf.template (client_max_body_size)
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/ogg',
      'audio/x-m4a',
      'audio/aac'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Helper functions
async function loadMetadata() {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf8');
    const metadata = JSON.parse(data);

    // Migrate old format (array) to new format (object with sounds and projects)
    if (Array.isArray(metadata)) {
      const allSoundIds = metadata.map(s => s.id);
      const migratedMetadata = {
        sounds: metadata,
        projects: [
          {
            id: 'default',
            name: 'Default Project',
            soundIds: allSoundIds,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
          }
        ]
      };
      // Save migrated format
      await saveMetadata(migratedMetadata);
      return migratedMetadata;
    }

    // Ensure projects exist (for backwards compatibility)
    if (!metadata.projects) {
      metadata.projects = [
        {
          id: 'default',
          name: 'Default Project',
          soundIds: metadata.sounds ? metadata.sounds.map(s => s.id) : [],
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      ];
      await saveMetadata(metadata);
    }

    return metadata;
  } catch (error) {
    console.error('Error loading metadata:', error);
    return {
      sounds: [],
      projects: [
        {
          id: 'default',
          name: 'Default Project',
          soundIds: [],
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      ]
    };
  }
}

async function saveMetadata(metadata) {
  try {
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Error saving metadata:', error);
    throw error;
  }
}

async function extractAudioTitle(filePath, fallbackFilename) {
  try {
    const metadata = await parseFile(filePath);
    // Try to get title from metadata tags
    if (metadata.common && metadata.common.title) {
      return metadata.common.title;
    }
  } catch (error) {
    console.log('Could not extract metadata, using filename:', error.message);
  }

  // Fallback to filename without extension
  return fallbackFilename.replace(/\.[^/.]+$/, '');
}

// Serve static files (frontend)
app.use(express.static(__dirname, {
  index: 'index.html'
}));

// API Routes

// Check if server mode is enabled (used by frontend)
app.get('/api/mode', (req, res) => {
  res.json({ mode: 'server', requiresAuth: true });
});

// Get all sounds metadata (no auth required for reading)
app.get('/api/sounds', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    res.json(metadata.sounds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load sounds' });
  }
});

// Get specific sound file (no auth required for reading)
app.get('/api/sounds/:id/file', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const sound = metadata.sounds.find(s => s.id === req.params.id);

    if (!sound) {
      return res.status(404).json({ error: 'Sound not found' });
    }

    const filePath = path.join(SOUNDS_DIR, sound.filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ error: 'Sound file not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', sound.fileType);
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving sound file:', error);
    res.status(500).json({ error: 'Failed to serve sound file' });
  }
});

// Upload new sound (requires authentication)
app.post('/api/sounds', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, category, emoji, projectId } = req.body;

    // Generate unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Extract title from audio metadata if no name provided
    const filePath = path.join(SOUNDS_DIR, req.file.filename);
    const soundName = name || await extractAudioTitle(filePath, req.file.originalname);

    // Create metadata entry
    const soundMetadata = {
      id: id,
      name: soundName,
      category: category || 'sfx',
      emoji: emoji || '🔊',
      filename: req.file.filename,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      dateAdded: new Date().toISOString()
    };

    // Load existing metadata
    const metadata = await loadMetadata();
    metadata.sounds.push(soundMetadata);

    // Add to project if specified
    if (projectId) {
      const project = metadata.projects.find(p => p.id === projectId);
      if (project && !project.soundIds.includes(id)) {
        project.soundIds.push(id);
        project.lastModified = new Date().toISOString();
      }
    }

    // Save updated metadata
    await saveMetadata(metadata);

    res.json(soundMetadata);
  } catch (error) {
    console.error('Error uploading sound:', error);
    res.status(500).json({ error: 'Failed to upload sound' });
  }
});

// Delete sound
app.delete('/api/sounds/:id', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const soundIndex = metadata.sounds.findIndex(s => s.id === req.params.id);

    if (soundIndex === -1) {
      return res.status(404).json({ error: 'Sound not found' });
    }

    const sound = metadata.sounds[soundIndex];
    const filePath = path.join(SOUNDS_DIR, sound.filename);

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('File not found, continuing with metadata deletion');
    }

    // Remove from all projects
    metadata.projects.forEach(project => {
      const soundIdIndex = project.soundIds.indexOf(req.params.id);
      if (soundIdIndex !== -1) {
        project.soundIds.splice(soundIdIndex, 1);
        project.lastModified = new Date().toISOString();
      }
    });

    // Remove from metadata
    metadata.sounds.splice(soundIndex, 1);
    await saveMetadata(metadata);

    res.json({ message: 'Sound deleted successfully' });
  } catch (error) {
    console.error('Error deleting sound:', error);
    res.status(500).json({ error: 'Failed to delete sound' });
  }
});

// Update sound metadata
app.put('/api/sounds/:id', async (req, res) => {
  try {
    const { name, emoji } = req.body;
    const metadata = await loadMetadata();
    const sound = metadata.sounds.find(s => s.id === req.params.id);

    if (!sound) {
      return res.status(404).json({ error: 'Sound not found' });
    }

    // Update fields
    if (name !== undefined) {
      sound.name = name.trim();
    }
    if (emoji !== undefined) {
      sound.emoji = emoji;
    }

    await saveMetadata(metadata);

    res.json(sound);
  } catch (error) {
    console.error('Error updating sound:', error);
    res.status(500).json({ error: 'Failed to update sound' });
  }
});

// ==================== PROJECT ENDPOINTS ====================

// Get all projects (no auth required for reading)
app.get('/api/projects', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    res.json(metadata.projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Generate unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Create project
    const project = {
      id: id,
      name: name.trim(),
      soundIds: [],
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Load existing metadata
    const metadata = await loadMetadata();
    metadata.projects.push(project);

    // Save updated metadata
    await saveMetadata(metadata);

    res.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { name, soundIds } = req.body;

    const metadata = await loadMetadata();
    const project = metadata.projects.find(p => p.id === req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update fields
    if (name !== undefined) {
      project.name = name.trim();
    }
    if (soundIds !== undefined && Array.isArray(soundIds)) {
      project.soundIds = soundIds;
    }
    project.lastModified = new Date().toISOString();

    await saveMetadata(metadata);

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const metadata = await loadMetadata();

    // Prevent deleting last project
    if (metadata.projects.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last project' });
    }

    const projectIndex = metadata.projects.findIndex(p => p.id === req.params.id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Remove project
    metadata.projects.splice(projectIndex, 1);
    await saveMetadata(metadata);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ==================== PLAYLIST ENDPOINTS ====================

// Get all playlists (no auth required for reading)
app.get('/api/playlists', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    // Ensure playlists array exists
    if (!metadata.playlists) {
      metadata.playlists = [];
    }
    res.json(metadata.playlists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load playlists' });
  }
});

// Get specific playlist (no auth required for reading)
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const playlist = metadata.playlists ? metadata.playlists.find(p => p.id === req.params.id) : null;

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json(playlist);
  } catch (error) {
    console.error('Error getting playlist:', error);
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

// Create new playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const { name, loop } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    // Generate unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Create playlist
    const playlist = {
      id: id,
      name: name.trim(),
      loop: loop || false,
      tracks: [],
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Load existing metadata
    const metadata = await loadMetadata();
    if (!metadata.playlists) {
      metadata.playlists = [];
    }
    metadata.playlists.push(playlist);

    // Save updated metadata
    await saveMetadata(metadata);

    res.json(playlist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Update playlist
app.put('/api/playlists/:id', async (req, res) => {
  try {
    const { name, loop } = req.body;

    const metadata = await loadMetadata();
    const playlist = metadata.playlists ? metadata.playlists.find(p => p.id === req.params.id) : null;

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Update fields
    if (name !== undefined) {
      playlist.name = name.trim();
    }
    if (loop !== undefined) {
      playlist.loop = loop;
    }
    playlist.lastModified = new Date().toISOString();

    await saveMetadata(metadata);

    res.json(playlist);
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete playlist
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const metadata = await loadMetadata();

    if (!metadata.playlists) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlistIndex = metadata.playlists.findIndex(p => p.id === req.params.id);

    if (playlistIndex === -1) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Remove playlist
    metadata.playlists.splice(playlistIndex, 1);
    await saveMetadata(metadata);

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Add track to playlist
app.post('/api/playlists/:id/tracks', async (req, res) => {
  try {
    const { soundId, volume, pauseMin, pauseMax } = req.body;

    if (!soundId) {
      return res.status(400).json({ error: 'Sound ID is required' });
    }

    const metadata = await loadMetadata();
    const playlist = metadata.playlists ? metadata.playlists.find(p => p.id === req.params.id) : null;

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Ensure tracks array exists
    if (!playlist.tracks) {
      playlist.tracks = [];
    }

    // Generate unique track ID
    const trackId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Create track
    const track = {
      id: trackId,
      soundId: soundId,
      order: playlist.tracks.length,
      volume: volume !== undefined ? volume : 0.8,
      pauseMin: pauseMin !== undefined ? pauseMin : 0,
      pauseMax: pauseMax !== undefined ? pauseMax : 0,
      addedAt: new Date().toISOString()
    };

    playlist.tracks.push(track);
    playlist.lastModified = new Date().toISOString();

    await saveMetadata(metadata);

    res.json(track);
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    res.status(500).json({ error: 'Failed to add track to playlist' });
  }
});

// Update playlist track
app.put('/api/playlists/:playlistId/tracks/:trackId', async (req, res) => {
  try {
    const { volume, pauseMin, pauseMax } = req.body;

    const metadata = await loadMetadata();
    const playlist = metadata.playlists ? metadata.playlists.find(p => p.id === req.params.playlistId) : null;

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const track = playlist.tracks ? playlist.tracks.find(t => t.id === req.params.trackId) : null;

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Update fields
    if (volume !== undefined) {
      track.volume = volume;
    }
    if (pauseMin !== undefined) {
      track.pauseMin = pauseMin;
    }
    if (pauseMax !== undefined) {
      track.pauseMax = pauseMax;
    }

    playlist.lastModified = new Date().toISOString();

    await saveMetadata(metadata);

    res.json(track);
  } catch (error) {
    console.error('Error updating playlist track:', error);
    res.status(500).json({ error: 'Failed to update playlist track' });
  }
});

// Delete track from playlist
app.delete('/api/playlists/:playlistId/tracks/:trackId', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const playlist = metadata.playlists ? metadata.playlists.find(p => p.id === req.params.playlistId) : null;

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (!playlist.tracks) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const trackIndex = playlist.tracks.findIndex(t => t.id === req.params.trackId);

    if (trackIndex === -1) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Remove track
    playlist.tracks.splice(trackIndex, 1);

    // Reorder remaining tracks
    playlist.tracks.forEach((track, index) => {
      track.order = index;
    });

    playlist.lastModified = new Date().toISOString();

    await saveMetadata(metadata);

    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    console.error('Error deleting track from playlist:', error);
    res.status(500).json({ error: 'Failed to delete track from playlist' });
  }
});

// Reorder playlist tracks
app.put('/api/playlists/:id/reorder', async (req, res) => {
  try {
    const { trackIds } = req.body;

    if (!Array.isArray(trackIds)) {
      return res.status(400).json({ error: 'trackIds must be an array' });
    }

    const metadata = await loadMetadata();
    const playlist = metadata.playlists ? metadata.playlists.find(p => p.id === req.params.id) : null;

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (!playlist.tracks) {
      playlist.tracks = [];
    }

    // Reorder tracks based on trackIds array
    const reorderedTracks = [];
    trackIds.forEach((trackId, index) => {
      const track = playlist.tracks.find(t => t.id === trackId);
      if (track) {
        track.order = index;
        reorderedTracks.push(track);
      }
    });

    playlist.tracks = reorderedTracks;
    playlist.lastModified = new Date().toISOString();

    await saveMetadata(metadata);

    res.json(playlist);
  } catch (error) {
    console.error('Error reordering playlist tracks:', error);
    res.status(500).json({ error: 'Failed to reorder playlist tracks' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'server' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎲 D&D Soundboard server running on port ${PORT}`);
  console.log(`📁 Sounds directory: ${SOUNDS_DIR}`);
  console.log(`🔐 Authentication: Handled by nginx (HTTP Basic Auth)`);
});
