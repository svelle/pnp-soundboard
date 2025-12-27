// Express server for D&D Soundboard
// Supports server-side storage and authentication

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;
const SOUNDBOARD_PASSWORD = process.env.SOUNDBOARD_PASSWORD || 'change-me';
const SOUNDS_DIR = path.join(__dirname, 'sounds');
const METADATA_FILE = path.join(__dirname, 'sounds', 'metadata.json');

// Ensure sounds directory exists
if (!fsSync.existsSync(SOUNDS_DIR)) {
  fsSync.mkdirSync(SOUNDS_DIR, { recursive: true });
}

// Initialize metadata file if it doesn't exist
if (!fsSync.existsSync(METADATA_FILE)) {
  fsSync.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2));
}

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticate = basicAuth({
  users: { 'admin': SOUNDBOARD_PASSWORD },
  challenge: true,
  realm: 'D&D Soundboard'
});

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
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading metadata:', error);
    return [];
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
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load sounds' });
  }
});

// Get specific sound file (no auth required for reading)
app.get('/api/sounds/:id/file', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const sound = metadata.find(s => s.id === req.params.id);

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
app.post('/api/sounds', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, category, emoji } = req.body;

    // Generate unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Create metadata entry
    const soundMetadata = {
      id: id,
      name: name || req.file.originalname.replace(/\.[^/.]+$/, ''),
      category: category || 'sfx',
      emoji: emoji || '🔊',
      filename: req.file.filename,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      dateAdded: new Date().toISOString()
    };

    // Load existing metadata
    const metadata = await loadMetadata();
    metadata.push(soundMetadata);

    // Save updated metadata
    await saveMetadata(metadata);

    res.json(soundMetadata);
  } catch (error) {
    console.error('Error uploading sound:', error);
    res.status(500).json({ error: 'Failed to upload sound' });
  }
});

// Delete sound (requires authentication)
app.delete('/api/sounds/:id', authenticate, async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const soundIndex = metadata.findIndex(s => s.id === req.params.id);

    if (soundIndex === -1) {
      return res.status(404).json({ error: 'Sound not found' });
    }

    const sound = metadata[soundIndex];
    const filePath = path.join(SOUNDS_DIR, sound.filename);

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('File not found, continuing with metadata deletion');
    }

    // Remove from metadata
    metadata.splice(soundIndex, 1);
    await saveMetadata(metadata);

    res.json({ message: 'Sound deleted successfully' });
  } catch (error) {
    console.error('Error deleting sound:', error);
    res.status(500).json({ error: 'Failed to delete sound' });
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
  console.log(`🔐 Authentication: ${SOUNDBOARD_PASSWORD === 'change-me' ? '⚠️  Using default password! Please set SOUNDBOARD_PASSWORD' : 'Enabled'}`);
});
