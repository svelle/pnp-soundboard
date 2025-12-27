// Application constants

export const DB_NAME = 'dnd-soundboard-db';
export const DB_VERSION = 1;
export const SOUNDS_STORE = 'sounds';
export const SETTINGS_STORE = 'settings';

export const CATEGORIES = {
  SFX: 'sfx',
  MUSIC: 'music',
  AMBIENCE: 'ambience'
};

export const CATEGORY_LABELS = {
  [CATEGORIES.SFX]: 'Sound Effects',
  [CATEGORIES.MUSIC]: 'Background Music',
  [CATEGORIES.AMBIENCE]: 'Ambience'
};

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/x-m4a',
  'audio/aac'
];

export const DEFAULT_VOLUME = 0.8;
export const DEFAULT_MASTER_VOLUME = 0.8;
