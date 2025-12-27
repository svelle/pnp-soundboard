// Volume Controls - Master and individual track volume management

import { debounce } from '../utils/helpers.js';

export class VolumeControls {
  constructor(audioMixer) {
    this.audioMixer = audioMixer;

    this.masterVolumeSlider = document.getElementById('masterVolumeSlider');
    this.masterVolumeValue = document.getElementById('masterVolumeValue');

    this.init();
  }

  init() {
    // Master volume control
    this.masterVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.setMasterVolume(value);
    });

    // Set initial visual value
    this.updateSliderVisual(this.masterVolumeSlider, this.masterVolumeSlider.value);
  }

  /**
   * Set master volume
   * @param {number} value - Volume percentage (0-100)
   */
  setMasterVolume(value) {
    const normalized = value / 100;
    this.audioMixer.setMasterVolume(normalized);

    // Update display
    this.masterVolumeValue.textContent = `${value}%`;

    // Update slider visual
    this.updateSliderVisual(this.masterVolumeSlider, value);
  }

  /**
   * Create a volume slider for a sound card
   * @param {string} trackId - Track ID
   * @param {Function} onChange - Callback when volume changes
   * @param {number} initialValue - Initial volume (0-100)
   * @returns {HTMLElement} Volume slider element
   */
  createTrackVolumeSlider(trackId, onChange, initialValue = 80) {
    const container = document.createElement('div');
    container.className = 'track-volume';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = initialValue.toString();
    slider.className = 'w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700';
    slider.dataset.trackId = trackId;

    // Update visual on creation
    this.updateSliderVisual(slider, initialValue);

    // Debounced change handler for performance
    const debouncedOnChange = debounce((value) => {
      if (onChange) {
        onChange(value);
      }
    }, 50);

    slider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.updateSliderVisual(slider, value);
      debouncedOnChange(value);
    });

    // Prevent event bubbling
    slider.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    container.appendChild(slider);

    return container;
  }

  /**
   * Update slider visual feedback
   * @param {HTMLElement} slider - Slider element
   * @param {number} value - Current value (0-100)
   */
  updateSliderVisual(slider, value) {
    slider.style.setProperty('--value', `${value}%`);
  }

  /**
   * Get current master volume
   * @returns {number} Volume percentage (0-100)
   */
  getMasterVolume() {
    return parseInt(this.masterVolumeSlider.value);
  }
}
