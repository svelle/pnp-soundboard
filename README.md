# 🎲 D&D Soundboard

A touch-friendly web-based soundboard for Dungeons & Dragons sessions. Play sound effects, background music, and ambient loops with individual volume controls and layered playback.

🌐 **Live Demo:** [https://svelle.github.io/pnp-soundboard/](https://svelle.github.io/pnp-soundboard/)

## ✨ Features

- 🔊 **Sound Effects** - Quick one-shot sounds (sword clashes, explosions, etc.)
- 🎵 **Background Music** - Loopable music tracks for different moods
- 🌊 **Ambience** - Environmental loops (rain, ocean, forest, etc.)
- 📁 **Projects** - Organize sounds into different campaigns/sessions
- 🎚️ **Individual Volume Controls** - Adjust each sound independently
- 🔄 **Layered Playback** - Play multiple sounds simultaneously
- ⏸️ **Pause/Resume** - Pause and resume playback with position memory
- 📊 **Progress Indicators** - Visual progress bars for music and ambience tracks
- ⏸️ **Random Pause Intervals** - Add natural variety with random pauses between loops
- 📱 **Touch-Friendly** - Optimized for iPad and MacBook
- 💾 **Browser Storage** - Sounds persist in your browser (IndexedDB)
- 🎨 **Custom Emojis** - Personalize each sound with emojis
- 📦 **Large File Support** - Upload files up to 100MB
- 🎯 **Drag & Drop** - Easy file uploads via drag and drop

## 🚀 Getting Started

### Deployment Modes

The soundboard supports two modes:

1. **Local Mode** - Sounds stored in browser (IndexedDB)
2. **Server Mode** - Sounds stored on server (recommended for sessions)

### Local Mode (Quick Start)

For testing or personal use, run as a static site:

**Option 1: Using Python**
```bash
python -m http.server 8000
```

**Option 2: Using Node.js**
```bash
npx http-server -p 8000
```

**Option 3: VS Code Live Server**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

Then open `http://localhost:8000`

### Server Mode (VPS Deployment) - Recommended for D&D Sessions

Deploy to a VPS to pre-load sounds for your session. Sounds are served from the server, so players only need to load the page.

#### Docker Deployment (Recommended)

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/dnd-soundboard.git
cd dnd-soundboard
```

**2. Set your password**
```bash
# Create .env file
cp .env.example .env

# Edit .env and set a secure password
nano .env  # or use your favorite editor
```

Update `SOUNDBOARD_PASSWORD` in `.env`:
```env
SOUNDBOARD_PASSWORD=your-secure-password-here
```

**3. Build and run with Docker Compose**
```bash
docker-compose up -d
```

The soundboard will be available at `http://your-vps-ip:3000`

**4. Upload sounds before your session**
- Access the URL in your browser
- Enter credentials when prompted:
  - Username: `admin`
  - Password: Your SOUNDBOARD_PASSWORD from `.env`
- Click "Upload" button
- Upload all sound effects, music, and ambience
- Sounds are stored on the server in the `./sounds` directory

**5. Share the URL and credentials with players**
- Give them the URL and same credentials (username: `admin`, password from `.env`)
- Sounds will pre-load automatically when they open the page
- Loading indicators show which sounds are ready
- No need to upload sounds again - they persist on the server

#### Manual Node.js Deployment

```bash
# Install dependencies
npm install

# Set environment variables
export PORT=3000
export SOUNDBOARD_PASSWORD=your-password

# Start server
npm start
```

#### Dockerfile Configuration

You can customize the Dockerfile to set a default password:

```dockerfile
ENV SOUNDBOARD_PASSWORD=your-default-password
```

Or override at runtime:
```bash
docker run -e SOUNDBOARD_PASSWORD=mysecret -p 3000:3000 dnd-soundboard
```

#### Data Persistence

Sounds are stored in `./sounds` directory. With Docker Compose, this is automatically mounted as a volume, so sounds persist across container restarts.

To backup your sounds:
```bash
tar -czf sounds-backup.tar.gz sounds/
```

To restore:
```bash
tar -xzf sounds-backup.tar.gz
```

## 📖 How to Use

### 1. Upload Sounds

1. Click the **⬆️ Upload** button
2. Select a category (SFX, Music, or Ambience)
3. Add an audio file in one of two ways:
   - **Drag & drop** the file onto the drop zone
   - **Click "Browse Files"** to select from your device
4. Optionally customize the name and emoji
5. Click **Upload Sound**

Supported formats: MP3, WAV, OGG (recommended)

### 2. Play Sounds

- **Tap/Click** the ▶️ button to start playing (changes to ⏸️ when playing)
- **Tap/Click** the ⏸️ button to pause (changes back to ▶️ to resume)
- **Tap/Click** the ⏹️ stop button to stop and reset to beginning
- Use the **🔁 Loop** button on Music/Ambience to enable looping
- Use the **⏸️ Random Pause** button to add random pauses between loops (more variety!)
  - When enabled, set min/max pause duration in seconds
  - Great for creating natural ambient soundscapes
- **Adjust the volume slider** on each card to control individual sound volume
  - Works independently from master volume
  - Final volume = Master Volume × Individual Volume
- **Progress indicator** shows playback position for Music and Ambience tracks
  - Real-time progress bar with time display (e.g., "1:23 / 3:45")
  - Updates every 100ms for smooth animation
  - Pauses when track is paused, resets when stopped
  - Works with looping tracks

### 3. Organize with Projects

- **Project Dropdown** - Select which project/campaign to view
- **All Projects** - View all sounds across all projects
- **Manage Projects** - Create, rename, and delete projects via ⚙️ button
- **Multi-Project Sounds** - Assign sounds to multiple projects when uploading
- **Auto-Stop on Switch** - All sounds stop when switching projects

### 4. Master Controls

- **Master Volume** - Controls overall volume for all sounds
- **⏹️ Stop All** - Stops all currently playing sounds

### 5. Delete Sounds

Click the **🗑️** button on any sound card to delete it (requires confirmation)

### 6. Keyboard Shortcuts

- **U** - Open upload modal
- **Space/Enter** - Stop all sounds
- **Escape** - Close upload modal

## 🏗️ Architecture

### Tech Stack

- **Vanilla JavaScript** (ES6 modules)
- **Tailwind CSS** (via CDN)
- **Web Audio API** (for audio playback and mixing)
- **IndexedDB** (for browser storage)

### Project Structure

```
dnd-soundboard/
├── index.html              # Main HTML file
├── styles/
│   └── main.css           # Custom CSS
├── js/
│   ├── main.js            # Application entry point
│   ├── audio/
│   │   ├── AudioMixer.js      # Web Audio API context
│   │   ├── AudioTrack.js      # Individual audio tracks
│   │   └── AudioManager.js    # Audio coordination
│   ├── storage/
│   │   ├── IndexedDBManager.js  # Database operations
│   │   ├── SoundLibrary.js      # Sound CRUD (local)
│   │   └── ServerStorage.js     # Sound CRUD (server)
│   ├── ui/
│   │   ├── UIController.js      # UI coordinator
│   │   ├── SoundBoard.js        # Sound grid
│   │   ├── UploadManager.js     # Upload handling
│   │   ├── VolumeControls.js    # Volume sliders
│   │   └── ProjectManager.js    # Project management
│   └── utils/
│       ├── constants.js         # App constants
│       └── helpers.js           # Utility functions
└── README.md
```

### Key Components

#### Audio System (Web Audio API)
- **AudioMixer** - Manages AudioContext and master gain node
- **AudioTrack** - Wraps individual audio sources with gain control
- **AudioManager** - Coordinates all active tracks and playback

#### Storage (IndexedDB)
- **IndexedDBManager** - Low-level database operations
- **SoundLibrary** - High-level API for managing sounds

#### UI Components
- **UIController** - Main UI coordinator
- **SoundBoard** - Renders and manages sound cards
- **UploadManager** - Handles file uploads
- **VolumeControls** - Volume slider management

## 🎵 Audio Format Support

### Recommended
- **MP3** - Best compatibility across all browsers
- **WAV** - Universal support, larger file size

### Also Supported
- **OGG** - Chrome and Firefox
- **M4A/AAC** - Safari

### File Size Limits
- Maximum: 100MB per file
- IndexedDB quota: ~50-100MB+ (varies by browser, can be several GB)

## 📱 Mobile Optimization

- Touch-friendly buttons (44px+ tap targets)
- Larger slider handles for easy adjustment
- Responsive grid layout
- Prevents text selection on double-tap
- AudioContext auto-resumes on first user interaction

## 🔧 Customization

### Changing Default Volume
Edit `js/utils/constants.js`:
```javascript
export const DEFAULT_VOLUME = 0.8; // 80%
export const DEFAULT_MASTER_VOLUME = 0.8; // 80%
```

### Changing File Size Limit
Edit `js/utils/constants.js`:
```javascript
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
```

### Adding More Categories
Edit `js/utils/constants.js` and add corresponding sections to `index.html`

## 🐛 Troubleshooting

### No sound on mobile?
- Ensure you've interacted with the page first (tap anywhere)
- Check device volume and mute switch
- Web Audio API requires user interaction on iOS/Android

### Upload fails?
- Check file size (<100MB)
- Ensure file format is supported (MP3, WAV, OGG)
- **Server mode**: Verify password is correct
- Check browser console for errors

### Sounds don't persist? (Local mode)
- IndexedDB may be disabled in private/incognito mode
- Check browser storage settings
- Clear cache may delete stored sounds

### Pre-loading stuck? (Server mode)
- Check network connection
- Refresh the page
- Check server logs: `docker-compose logs -f`

### Performance issues?
- Limit simultaneous sounds to ~10-20 tracks
- Use compressed formats (MP3) over WAV
- **Server mode**: Ensure adequate bandwidth for pre-loading

### Server mode not working?
- Verify server is running: `docker-compose ps`
- Check port 3000 is accessible
- Check firewall rules on VPS
- View logs: `docker-compose logs -f`

## 🎯 Future Enhancements

- [x] Drag-and-drop file upload
- [ ] Sound categories/tags
- [ ] Preset soundscapes (save/load combinations)
- [ ] Fade in/out controls
- [ ] Keyboard shortcuts for quick play (1-9)
- [ ] Export/import sound library
- [ ] Sound preview before upload
- [ ] Waveform visualization
- [ ] Cross-fade between background music
- [ ] Search/filter sounds
- [ ] Sound duration progress bar
- [ ] Mobile app (PWA)
- [ ] Save pause interval settings per sound

## 📄 License

This project is open source and available for personal use.

## 🎲 Happy Gaming!

Perfect for D&D, Pathfinder, or any tabletop RPG. Create the perfect atmosphere for your adventures!
