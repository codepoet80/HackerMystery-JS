/**
 * HackerMystery.GameState
 *
 * Central game state manager. Tracks player progress, inventory,
 * puzzle completion, and other game data.
 */
enyo.kind({
	name: "HackerMystery.GameState",
	kind: enyo.Component,

	// Singleton instance
	statics: {
		instance: null,
		getInstance: function() {
			if (!HackerMystery.GameState.instance) {
				HackerMystery.GameState.instance = new HackerMystery.GameState();
			}
			return HackerMystery.GameState.instance;
		}
	},

	published: {
		currentLocation: "desktop",
		inventory: null,
		flags: null,
		unlockedPrograms: null,
		commandHistory: null,
		playTime: 0,
		saveSlot: 0
	},

	create: function() {
		this.inherited(arguments);
		this.reset();
	},

	/**
	 * Reset game state to initial values
	 */
	reset: function() {
		this.inventory = [];
		this.flags = {};
		this.unlockedPrograms = ["terminal"];
		this.commandHistory = [];
		this.playTime = 0;
		this.currentLocation = "desktop";
	},

	/**
	 * Set a game flag
	 */
	setFlag: function(key, value) {
		var oldValue = this.flags[key];
		this.flags[key] = value;

		// Notify puzzle engine of flag change
		if (value !== oldValue && HackerMystery.PuzzleEngine) {
			var puzzleEngine = HackerMystery.PuzzleEngine.getInstance();
			if (puzzleEngine) {
				puzzleEngine.onFlagChanged(key, value);
			}
		}
	},

	/**
	 * Get a game flag
	 */
	getFlag: function(key, defaultValue) {
		if (this.flags.hasOwnProperty(key)) {
			return this.flags[key];
		}
		return defaultValue !== undefined ? defaultValue : null;
	},

	/**
	 * Add item to inventory
	 */
	addToInventory: function(item) {
		if (this.inventory.indexOf(item) === -1) {
			this.inventory.push(item);
			return true;
		}
		return false;
	},

	/**
	 * Check if item is in inventory
	 */
	hasItem: function(item) {
		return this.inventory.indexOf(item) !== -1;
	},

	/**
	 * Unlock a program
	 */
	unlockProgram: function(programName) {
		if (this.unlockedPrograms.indexOf(programName) === -1) {
			this.unlockedPrograms.push(programName);
			return true;
		}
		return false;
	},

	/**
	 * Check if program is unlocked
	 */
	isProgramUnlocked: function(programName) {
		return this.unlockedPrograms.indexOf(programName) !== -1;
	},

	/**
	 * Add command to history
	 */
	addCommandToHistory: function(command) {
		this.commandHistory.push({
			command: command,
			timestamp: Date.now()
		});
	},

	/**
	 * Export state as plain object for saving
	 */
	toJSON: function() {
		return {
			version: 1,
			currentLocation: this.currentLocation,
			inventory: this.inventory.slice(),
			flags: JSON.parse(JSON.stringify(this.flags)),
			unlockedPrograms: this.unlockedPrograms.slice(),
			commandHistory: this.commandHistory.slice(),
			playTime: this.playTime,
			savedAt: Date.now()
		};
	},

	/**
	 * Import state from plain object
	 */
	fromJSON: function(data) {
		if (!data || data.version !== 1) {
			return false;
		}
		this.currentLocation = data.currentLocation || "desktop";
		this.inventory = data.inventory || [];
		this.flags = data.flags || {};
		this.unlockedPrograms = data.unlockedPrograms || ["terminal"];
		this.commandHistory = data.commandHistory || [];
		this.playTime = data.playTime || 0;
		return true;
	}
});
