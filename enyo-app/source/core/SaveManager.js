/**
 * HackerMystery.SaveManager
 *
 * Handles saving and loading game state.
 * Currently uses localStorage, but abstracted for future server-side saves.
 */
enyo.kind({
	name: "HackerMystery.SaveManager",
	kind: enyo.Component,

	// Singleton instance
	statics: {
		instance: null,
		getInstance: function() {
			if (!HackerMystery.SaveManager.instance) {
				HackerMystery.SaveManager.instance = new HackerMystery.SaveManager();
			}
			return HackerMystery.SaveManager.instance;
		},

		// Storage key prefix
		STORAGE_KEY: "hackermystery_save_"
	},

	/**
	 * Save game synchronously (convenience method)
	 * @param {number} slot - Save slot number (0-9)
	 * @returns {boolean} success
	 */
	saveGame: function(slot) {
		slot = slot || 0;
		var key = HackerMystery.SaveManager.STORAGE_KEY + slot;

		try {
			var gameState = HackerMystery.GameState.getInstance();
			var data = gameState.toJSON();
			data.slot = slot;
			var dataStr = JSON.stringify(data);
			localStorage.setItem(key, dataStr);
			enyo.log("Game saved to slot " + slot);
			return true;
		} catch (e) {
			enyo.error("SaveManager.saveGame error: " + e.message);
			return false;
		}
	},

	/**
	 * Load game synchronously (convenience method)
	 * @param {number} slot - Save slot number (0-9)
	 * @returns {Object|null} save data or null
	 */
	loadGame: function(slot) {
		slot = slot || 0;
		var key = HackerMystery.SaveManager.STORAGE_KEY + slot;

		try {
			var dataStr = localStorage.getItem(key);
			if (dataStr) {
				var data = JSON.parse(dataStr);
				enyo.log("Game loaded from slot " + slot);
				return data;
			}
			return null;
		} catch (e) {
			enyo.error("SaveManager.loadGame error: " + e.message);
			return null;
		}
	},

	/**
	 * Save game state (async with callback)
	 * @param {number} slot - Save slot number (0-9)
	 * @param {function} callback - Called with (success, error)
	 */
	save: function(slot, callback) {
		var self = this;
		slot = slot || 0;

		try {
			var gameState = HackerMystery.GameState.getInstance();
			var data = gameState.toJSON();
			data.slot = slot;

			// Use the storage backend (currently localStorage)
			this._saveToStorage(slot, data, function(success, error) {
				if (callback) {
					callback(success, error);
				}
			});
		} catch (e) {
			enyo.error("SaveManager.save error: " + e.message);
			if (callback) {
				callback(false, e.message);
			}
		}
	},

	/**
	 * Load game state
	 * @param {number} slot - Save slot number (0-9)
	 * @param {function} callback - Called with (success, error)
	 */
	load: function(slot, callback) {
		var self = this;
		slot = slot || 0;

		try {
			this._loadFromStorage(slot, function(data, error) {
				if (error) {
					if (callback) {
						callback(false, error);
					}
					return;
				}

				if (!data) {
					if (callback) {
						callback(false, "No save data found");
					}
					return;
				}

				var gameState = HackerMystery.GameState.getInstance();
				var success = gameState.fromJSON(data);

				if (callback) {
					callback(success, success ? null : "Invalid save data");
				}
			});
		} catch (e) {
			enyo.error("SaveManager.load error: " + e.message);
			if (callback) {
				callback(false, e.message);
			}
		}
	},

	/**
	 * Check if a save exists in a slot
	 * @param {number} slot - Save slot number
	 * @param {function} callback - Called with (exists, saveInfo)
	 */
	hasSave: function(slot, callback) {
		slot = slot || 0;
		var key = HackerMystery.SaveManager.STORAGE_KEY + slot;

		try {
			var dataStr = localStorage.getItem(key);
			if (dataStr) {
				var data = JSON.parse(dataStr);
				if (callback) {
					callback(true, {
						savedAt: data.savedAt,
						playTime: data.playTime
					});
				}
			} else {
				if (callback) {
					callback(false, null);
				}
			}
		} catch (e) {
			if (callback) {
				callback(false, null);
			}
		}
	},

	/**
	 * Delete a save slot
	 * @param {number} slot - Save slot number
	 * @param {function} callback - Called with (success)
	 */
	deleteSave: function(slot, callback) {
		slot = slot || 0;
		var key = HackerMystery.SaveManager.STORAGE_KEY + slot;

		try {
			localStorage.removeItem(key);
			if (callback) {
				callback(true);
			}
		} catch (e) {
			if (callback) {
				callback(false);
			}
		}
	},

	/**
	 * Internal: Save to localStorage
	 * Replace this method for server-side saves
	 */
	_saveToStorage: function(slot, data, callback) {
		var key = HackerMystery.SaveManager.STORAGE_KEY + slot;

		try {
			var dataStr = JSON.stringify(data);
			localStorage.setItem(key, dataStr);
			enyo.log("Game saved to slot " + slot);
			if (callback) {
				callback(true, null);
			}
		} catch (e) {
			enyo.error("localStorage save failed: " + e.message);
			if (callback) {
				callback(false, e.message);
			}
		}
	},

	/**
	 * Internal: Load from localStorage
	 * Replace this method for server-side saves
	 */
	_loadFromStorage: function(slot, callback) {
		var key = HackerMystery.SaveManager.STORAGE_KEY + slot;

		try {
			var dataStr = localStorage.getItem(key);
			if (dataStr) {
				var data = JSON.parse(dataStr);
				enyo.log("Game loaded from slot " + slot);
				if (callback) {
					callback(data, null);
				}
			} else {
				if (callback) {
					callback(null, null);
				}
			}
		} catch (e) {
			enyo.error("localStorage load failed: " + e.message);
			if (callback) {
				callback(null, e.message);
			}
		}
	}
});
