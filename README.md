# 🎲 D&D Soundboard

A touch-friendly web-based soundboard for Dungeons & Dragons sessions. Play sound effects, background music, and ambient loops with individual volume controls and layered playback.

🌐 **Live Demo:** [https://svelle.github.io/pnp-soundboard/](https://svelle.github.io/pnp-soundboard/)

## ✨ Features

- 🔊 **Sound Effects** - Quick one-shot sounds (sword clashes, explosions, etc.)
- 🎵 **Background Music** - Loopable music tracks for different moods
- 🌊 **Ambience** - Environmental loops (rain, ocean, forest, etc.)
- 🎚️ **Individual Volume Controls** - Adjust each sound independently
- 🔄 **Layered Playback** - Play multiple sounds simultaneously
- ⏸️ **Random Pause Intervals** - Add natural variety with random pauses between loops
- 📱 **Touch-Friendly** - Optimized for iPad and MacBook
- 💾 **Browser Storage** - Sounds persist in your browser (IndexedDB)
- 🎨 **Custom Emojis** - Personalize each sound with emojis
- 📦 **Large File Support** - Upload files up to 100MB

## 🚀 Getting Started

### Running Locally

Since this is a static web app using ES6 modules, you'll need to serve it through a local web server.

**Option 1: Using Python**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option 2: Using Node.js (http-server)**
```bash
npx http-server -p 8000
```

**Option 3: Using VS Code Live Server**
- Install the "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

Then open your browser to `http://localhost:8000`

## 📖 How to Use

### 1. Upload Sounds

1. Click the **⬆️ Upload** button
2. Select a category (SFX, Music, or Ambience)
3. Choose an audio file (MP3, WAV, or OGG recommended)
4. Optionally customize the name and emoji
5. Click **Upload Sound**

### 2. Play Sounds

- **Tap/Click** the ▶️ button to play
- **Tap/Click** again (⏹️) to stop
- Use the **🔁 Loop** button on Music/Ambience to enable looping
- Use the **⏸️ Pause** button to add random pauses between loops (more variety!)
  - When enabled, set min/max pause duration in seconds
  - Great for creating natural ambient soundscapes
- Adjust the **volume slider** on each card

### 3. Master Controls

- **Master Volume** - Controls overall volume for all sounds
- **⏹️ Stop All** - Stops all currently playing sounds

### 4. Delete Sounds

Click the **🗑️** button on any sound card to delete it (requires confirmation)

### 5. Keyboard Shortcuts

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
│   │   └── SoundLibrary.js      # Sound CRUD
│   ├── ui/
│   │   ├── UIController.js      # UI coordinator
│   │   ├── SoundBoard.js        # Sound grid
│   │   ├── UploadManager.js     # Upload handling
│   │   └── VolumeControls.js    # Volume sliders
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
- Check browser console for errors

### Sounds don't persist?
- IndexedDB may be disabled in private/incognito mode
- Check browser storage settings
- Clear cache may delete stored sounds

### Performance issues?
- Limit simultaneous sounds to ~10-20 tracks
- Use compressed formats (MP3) over WAV
- Clear unused sounds periodically

## 🎯 Future Enhancements

- [ ] Drag-and-drop file upload
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
