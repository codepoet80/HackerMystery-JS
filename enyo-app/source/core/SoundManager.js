/**
 * HackerMystery.SoundManager
 *
 * Cross-compatible sound manager that supports both Web Audio API
 * (modern browsers) and HTML5 Audio fallback (older devices like webOS).
 * Pre-loads sounds for instant playback.
 *
 * Designed to fail gracefully - sound errors should never break game logic.
 */
enyo.kind({
	name: "HackerMystery.SoundManager",
	kind: enyo.Component,

	statics: {
		instance: null,
		getInstance: function() {
			if (!HackerMystery.SoundManager.instance) {
				HackerMystery.SoundManager.instance = new HackerMystery.SoundManager();
			}
			return HackerMystery.SoundManager.instance;
		}
	},

	// Sound base path
	basePath: "sounds/",

	// Web Audio API context (if supported)
	audioContext: null,

	// Cached audio buffers for Web Audio API
	audioBuffers: null,

	// Cached Audio objects for fallback
	audioElements: null,

	// Whether Web Audio API is supported
	useWebAudio: false,

	// Whether any audio is supported
	audioSupported: false,

	// Master volume (0.0 to 1.0)
	volume: 1.0,

	// Whether sound is enabled
	enabled: true,

	// List of sounds to preload
	soundList: [
		"startup.mp3",
		"success.mp3",
		"dialup.mp3",
		"dialup-fail.mp3",
		"dialup-noservice.mp3",
		"victory.mp3"
	],

	create: function() {
		this.inherited(arguments);
		this.audioBuffers = {};
		this.audioElements = {};

		try {
			this.initAudio();
		} catch (e) {
			enyo.warn("SoundManager: Error during initialization: " + e);
			this.audioSupported = false;
		}
	},

	/**
	 * Initialize audio system, preferring Web Audio API
	 */
	initAudio: function() {
		// Try to create Web Audio API context
		try {
			var AudioContext = window.AudioContext || window.webkitAudioContext;
			if (AudioContext) {
				this.audioContext = new AudioContext();
				this.useWebAudio = true;
				this.audioSupported = true;
				enyo.log("SoundManager: Using Web Audio API");
			}
		} catch (e) {
			enyo.log("SoundManager: Web Audio API not available: " + e);
		}

		// Check if HTML5 Audio is available as fallback
		if (!this.useWebAudio) {
			try {
				if (typeof Audio !== "undefined") {
					var testAudio = new Audio();
					if (testAudio) {
						this.audioSupported = true;
						enyo.log("SoundManager: Using HTML5 Audio fallback");
					}
				}
			} catch (e) {
				enyo.log("SoundManager: HTML5 Audio not available: " + e);
			}
		}

		if (!this.audioSupported) {
			enyo.warn("SoundManager: No audio support detected");
			return;
		}

		// Preload all sounds
		this.preloadSounds();
	},

	/**
	 * Preload all sounds in the sound list
	 */
	preloadSounds: function() {
		for (var i = 0; i < this.soundList.length; i++) {
			try {
				this.preloadSound(this.soundList[i]);
			} catch (e) {
				enyo.warn("SoundManager: Error preloading " + this.soundList[i] + ": " + e);
			}
		}
	},

	/**
	 * Preload a single sound
	 * @param {string} filename - Sound filename
	 */
	preloadSound: function(filename) {
		if (!this.audioSupported) return;

		var url = this.basePath + filename;

		try {
			if (this.useWebAudio) {
				// Preload using Web Audio API
				this.loadAudioBuffer(filename, url);
			} else {
				// Preload using HTML5 Audio
				this.loadAudioElement(filename, url);
			}
		} catch (e) {
			enyo.warn("SoundManager: Error in preloadSound " + filename + ": " + e);
		}
	},

	/**
	 * Load audio buffer for Web Audio API
	 * @param {string} filename - Sound filename (used as key)
	 * @param {string} url - URL to load
	 */
	loadAudioBuffer: function(filename, url) {
		var self = this;

		try {
			// Use XMLHttpRequest for compatibility with older WebKit
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.responseType = "arraybuffer";

			xhr.onload = function() {
				try {
					if (xhr.status === 200 || xhr.status === 0) {
						self.audioContext.decodeAudioData(
							xhr.response,
							function(buffer) {
								self.audioBuffers[filename] = buffer;
								enyo.log("SoundManager: Loaded (WebAudio) " + filename);
							},
							function(error) {
								enyo.warn("SoundManager: Error decoding " + filename);
								// Fall back to Audio element for this file
								self.loadAudioElement(filename, url);
							}
						);
					}
				} catch (e) {
					enyo.warn("SoundManager: Error processing " + filename + ": " + e);
				}
			};

			xhr.onerror = function() {
				enyo.warn("SoundManager: XHR error loading " + filename);
			};

			xhr.send();
		} catch (e) {
			enyo.warn("SoundManager: Error setting up XHR for " + filename + ": " + e);
		}
	},

	/**
	 * Load audio element for HTML5 Audio fallback
	 * @param {string} filename - Sound filename (used as key)
	 * @param {string} url - URL to load
	 */
	loadAudioElement: function(filename, url) {
		var self = this;

		try {
			var audio = new Audio();

			// Track loading state for webOS compatibility
			audio._loaded = false;
			audio._url = url;

			audio.addEventListener("canplaythrough", function() {
				audio._loaded = true;
				enyo.log("SoundManager: Loaded (Audio) " + filename);
			}, false);

			audio.addEventListener("error", function() {
				enyo.warn("SoundManager: Error loading " + filename);
			}, false);

			// Set source and begin loading
			audio.src = url;
			audio.load();

			this.audioElements[filename] = audio;
		} catch (e) {
			enyo.warn("SoundManager: Error creating Audio element for " + filename + ": " + e);
		}
	},

	/**
	 * Play a sound by filename
	 * @param {string} filename - Sound filename to play
	 * @param {Object} options - Optional settings (volume, loop, onEnded)
	 */
	play: function(filename, options) {
		options = options || {};

		// Fail silently if audio not supported or disabled
		if (!this.audioSupported || !this.enabled) {
			// Still call onEnded callback so game logic continues
			if (options.onEnded) {
				setTimeout(options.onEnded, 0);
			}
			return;
		}

		try {
			var volume = (options.volume !== undefined ? options.volume : 1.0) * this.volume;
			var loop = options.loop || false;
			var onEnded = options.onEnded || null;

			if (this.useWebAudio && this.audioBuffers[filename]) {
				this.playWebAudio(filename, volume, loop, onEnded);
			} else if (this.audioElements[filename]) {
				this.playAudioElement(filename, volume, loop, onEnded);
			} else {
				// Sound not loaded yet, try to load and play
				enyo.warn("SoundManager: Sound not preloaded: " + filename);
				this.preloadSound(filename);
				// Call onEnded since we can't play
				if (onEnded) {
					setTimeout(onEnded, 0);
				}
			}
		} catch (e) {
			enyo.warn("SoundManager: Error playing " + filename + ": " + e);
			// Call onEnded so game logic continues even on error
			if (options.onEnded) {
				setTimeout(options.onEnded, 0);
			}
		}
	},

	/**
	 * Play sound using Web Audio API
	 */
	playWebAudio: function(filename, volume, loop, onEnded) {
		try {
			var buffer = this.audioBuffers[filename];
			if (!buffer) {
				if (onEnded) setTimeout(onEnded, 0);
				return;
			}

			// Resume context if suspended (required by some browsers)
			if (this.audioContext.state === "suspended") {
				this.audioContext.resume();
			}

			// Create buffer source
			var source = this.audioContext.createBufferSource();
			source.buffer = buffer;
			source.loop = loop;

			// Set up onEnded callback
			if (onEnded && !loop) {
				source.onended = onEnded;
			}

			// Create gain node for volume
			var gainNode = this.audioContext.createGain();
			gainNode.gain.value = volume;

			// Connect nodes
			source.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			// Play
			source.start(0);
		} catch (e) {
			enyo.warn("SoundManager: WebAudio playback error: " + e);
			if (onEnded) setTimeout(onEnded, 0);
		}
	},

	/**
	 * Play sound using HTML5 Audio element
	 * Uses a pool approach for webOS compatibility (avoids cloneNode issues)
	 */
	playAudioElement: function(filename, volume, loop, onEnded) {
		try {
			var cached = this.audioElements[filename];
			if (!cached) {
				if (onEnded) setTimeout(onEnded, 0);
				return;
			}

			// For webOS compatibility, create a fresh Audio element each time
			// instead of using cloneNode which doesn't work reliably
			var audio = new Audio();
			audio.src = cached._url || (this.basePath + filename);

			// Set volume (may not be supported on all devices)
			try {
				audio.volume = volume;
			} catch (volErr) {
				// Volume control not supported, ignore
			}

			audio.loop = loop;

			// Set up onEnded callback
			if (onEnded && !loop) {
				audio.addEventListener("ended", onEnded, false);
			}

			// Play the sound - on older WebKit we need to wait for canplay
			var playSound = function() {
				try {
					audio.play();
				} catch (playErr) {
					enyo.warn("SoundManager: play() error: " + playErr);
					if (onEnded) setTimeout(onEnded, 0);
				}
			};

			// Check if we can play immediately or need to wait
			if (audio.readyState >= 2) {
				// HAVE_CURRENT_DATA or better - can play now
				playSound();
			} else {
				// Need to wait for audio to be ready
				audio.addEventListener("canplay", function() {
					playSound();
				}, false);

				// Also try to trigger loading
				audio.load();
			}
		} catch (e) {
			enyo.warn("SoundManager: Audio element playback error: " + e);
			if (onEnded) setTimeout(onEnded, 0);
		}
	},

	/**
	 * Set master volume
	 * @param {number} vol - Volume from 0.0 to 1.0
	 */
	setVolume: function(vol) {
		this.volume = Math.max(0, Math.min(1, vol));
	},

	/**
	 * Enable or disable all sounds
	 * @param {boolean} enabled - Whether sound is enabled
	 */
	setEnabled: function(enabled) {
		this.enabled = enabled;
	},

	/**
	 * Toggle sound on/off
	 * @returns {boolean} - New enabled state
	 */
	toggleEnabled: function() {
		this.enabled = !this.enabled;
		return this.enabled;
	}
});
