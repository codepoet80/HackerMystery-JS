/**
 * HackerMystery.PuzzleEngine
 *
 * Central puzzle management system. Registers puzzles with triggers
 * and completion conditions. Fires events when puzzles are completed.
 */
enyo.kind({
	name: "HackerMystery.PuzzleEngine",
	kind: enyo.Component,

	// Singleton instance
	statics: {
		instance: null,
		getInstance: function() {
			if (!HackerMystery.PuzzleEngine.instance) {
				HackerMystery.PuzzleEngine.instance = new HackerMystery.PuzzleEngine();
			}
			return HackerMystery.PuzzleEngine.instance;
		},

		// Puzzle states
		STATE_LOCKED: "locked",
		STATE_AVAILABLE: "available",
		STATE_COMPLETED: "completed"
	},

	// Registered puzzles by ID
	puzzles: null,

	// Completion callbacks
	listeners: null,

	// Track which puzzles have fired their completion event
	completedPuzzles: null,

	create: function() {
		this.inherited(arguments);
		this.puzzles = {};
		this.listeners = [];
		this.completedPuzzles = {};
		this.initPuzzles();
	},

	/**
	 * Initialize all game puzzles
	 */
	initPuzzles: function() {
		// Chapter 1 puzzles
		// Puzzle 1: Decrypt the too_many_secrets.enc file
		this.registerPuzzle({
			id: "decrypt_secrets",
			name: "Too Many Secrets",
			description: "Decrypt the mysterious encrypted file",
			chapter: 1,
			requiredFlags: [],  // Available from start
			completionFlag: "decrypted_too_many_secrets",
			rewards: {}
		});

		// Puzzle 2: Reply to Acid Burn on the message board
		this.registerPuzzle({
			id: "reply_to_acid_burn",
			name: "First Contact",
			description: "Reply to Acid Burn on The Underground BBS",
			chapter: 1,
			requiredFlags: [],  // Available from start (doesn't require decryption)
			completionFlag: "replied_to_acid_burn",
			rewards: {}
		});

		// Puzzle 3: Tell Acid Burn about GIBSON (requires knowing about it from decryption)
		this.registerPuzzle({
			id: "prove_yourself",
			name: "Prove Yourself",
			description: "Tell Acid Burn what you discovered about GIBSON",
			chapter: 1,
			requiredFlags: ["replied_to_acid_burn", "decrypted_too_many_secrets"],
			completionFlag: "contacted_acid_burn",
			rewards: {
				flags: { "acid_burn_ally": true }
			}
		});

		// Puzzle 4: Gain Acid Burn's trust (unlocks Elite board)
		this.registerPuzzle({
			id: "gain_trust",
			name: "Trusted Hacker",
			description: "Gain access to the Elite section",
			chapter: 1,
			requiredFlags: ["contacted_acid_burn"],
			completionFlag: "acid_burn_trusts_player",
			rewards: {}
		});

		// Puzzle 5: Find the inside contact hint
		this.registerPuzzle({
			id: "inside_contact",
			name: "Inside Information",
			description: "Learn about Acid Burn's contact on the inside",
			chapter: 1,
			requiredFlags: ["acid_burn_trusts_player"],
			completionFlag: "found_contacts_hint",
			rewards: {}
		});
	},

	/**
	 * Register a puzzle
	 * @param {Object} puzzle - Puzzle configuration
	 */
	registerPuzzle: function(puzzle) {
		if (!puzzle.id) {
			console.error("PuzzleEngine: Puzzle must have an ID");
			return;
		}

		this.puzzles[puzzle.id] = {
			id: puzzle.id,
			name: puzzle.name || puzzle.id,
			description: puzzle.description || "",
			chapter: puzzle.chapter || 1,
			requiredFlags: puzzle.requiredFlags || [],
			completionFlag: puzzle.completionFlag,
			rewards: puzzle.rewards || {},
			hints: puzzle.hints || []
		};
	},

	/**
	 * Get puzzle state
	 * @param {string} puzzleId - Puzzle ID
	 * @returns {string} - STATE_LOCKED, STATE_AVAILABLE, or STATE_COMPLETED
	 */
	getPuzzleState: function(puzzleId) {
		var puzzle = this.puzzles[puzzleId];
		if (!puzzle) {
			return null;
		}

		var gameState = HackerMystery.GameState.getInstance();

		// Check if already completed
		if (puzzle.completionFlag && gameState.getFlag(puzzle.completionFlag)) {
			return HackerMystery.PuzzleEngine.STATE_COMPLETED;
		}

		// Check if all required flags are set
		for (var i = 0; i < puzzle.requiredFlags.length; i++) {
			if (!gameState.getFlag(puzzle.requiredFlags[i])) {
				return HackerMystery.PuzzleEngine.STATE_LOCKED;
			}
		}

		return HackerMystery.PuzzleEngine.STATE_AVAILABLE;
	},

	/**
	 * Check if a puzzle is available (can be worked on)
	 * @param {string} puzzleId - Puzzle ID
	 */
	isPuzzleAvailable: function(puzzleId) {
		return this.getPuzzleState(puzzleId) === HackerMystery.PuzzleEngine.STATE_AVAILABLE;
	},

	/**
	 * Check if a puzzle is completed
	 * @param {string} puzzleId - Puzzle ID
	 */
	isPuzzleCompleted: function(puzzleId) {
		return this.getPuzzleState(puzzleId) === HackerMystery.PuzzleEngine.STATE_COMPLETED;
	},

	/**
	 * Complete a puzzle and apply rewards
	 * @param {string} puzzleId - Puzzle ID
	 * @returns {boolean} - True if puzzle was completed, false if already complete or invalid
	 */
	completePuzzle: function(puzzleId) {
		var puzzle = this.puzzles[puzzleId];
		if (!puzzle) {
			console.error("PuzzleEngine: Unknown puzzle: " + puzzleId);
			return false;
		}

		// Check if already completed
		if (this.isPuzzleCompleted(puzzleId)) {
			return false;
		}

		// Check if available
		if (!this.isPuzzleAvailable(puzzleId)) {
			console.warn("PuzzleEngine: Puzzle not available: " + puzzleId);
			return false;
		}

		var gameState = HackerMystery.GameState.getInstance();

		// Set completion flag
		if (puzzle.completionFlag) {
			gameState.setFlag(puzzle.completionFlag, true);
		}

		// Apply reward flags
		if (puzzle.rewards && puzzle.rewards.flags) {
			for (var flagName in puzzle.rewards.flags) {
				if (puzzle.rewards.flags.hasOwnProperty(flagName)) {
					gameState.setFlag(flagName, puzzle.rewards.flags[flagName]);
				}
			}
		}

		// Notify listeners
		this.firePuzzleComplete(puzzle);

		// Check if any dependent puzzles should auto-complete
		this.checkAutoComplete();

		return true;
	},

	/**
	 * Try to complete a puzzle by checking its completion flag
	 * Called when game state changes to see if puzzle conditions are met
	 * @param {string} puzzleId - Puzzle ID
	 */
	checkPuzzleCompletion: function(puzzleId) {
		var puzzle = this.puzzles[puzzleId];
		if (!puzzle) return false;

		// Already fired completion for this puzzle
		if (this.completedPuzzles[puzzleId]) {
			return false;
		}

		var gameState = HackerMystery.GameState.getInstance();

		// Check if completion flag is set
		if (!puzzle.completionFlag || !gameState.getFlag(puzzle.completionFlag)) {
			return false;
		}

		// Check if all required flags are met
		for (var i = 0; i < puzzle.requiredFlags.length; i++) {
			if (!gameState.getFlag(puzzle.requiredFlags[i])) {
				return false;
			}
		}

		// Mark as completed
		this.completedPuzzles[puzzleId] = true;

		// Apply rewards
		if (puzzle.rewards && puzzle.rewards.flags) {
			for (var flagName in puzzle.rewards.flags) {
				if (puzzle.rewards.flags.hasOwnProperty(flagName)) {
					gameState.setFlag(flagName, puzzle.rewards.flags[flagName]);
				}
			}
		}

		// Fire completion event
		this.firePuzzleComplete(puzzle);

		// Check if this unlocks other puzzles
		this.checkAutoComplete();

		return true;
	},

	/**
	 * Check all puzzles for auto-completion
	 * Called after any puzzle completes to trigger chains
	 */
	checkAutoComplete: function() {
		for (var puzzleId in this.puzzles) {
			if (this.puzzles.hasOwnProperty(puzzleId)) {
				this.checkPuzzleCompletion(puzzleId);
			}
		}
	},

	/**
	 * Notify the puzzle engine that a flag has changed
	 * This allows the engine to check for puzzle completions
	 * @param {string} flagName - Name of the flag that changed
	 * @param {*} value - New value of the flag
	 */
	onFlagChanged: function(flagName, value) {
		// Check all puzzles to see if this flag triggers completion
		for (var puzzleId in this.puzzles) {
			if (this.puzzles.hasOwnProperty(puzzleId)) {
				var puzzle = this.puzzles[puzzleId];
				if (puzzle.completionFlag === flagName && value) {
					this.checkPuzzleCompletion(puzzleId);
				}
			}
		}
	},

	/**
	 * Add a listener for puzzle completion events
	 * @param {Function} callback - Function(puzzle) called when puzzle completes
	 */
	addListener: function(callback) {
		this.listeners.push(callback);
	},

	/**
	 * Remove a puzzle completion listener
	 * @param {Function} callback - Callback to remove
	 */
	removeListener: function(callback) {
		var index = this.listeners.indexOf(callback);
		if (index !== -1) {
			this.listeners.splice(index, 1);
		}
	},

	/**
	 * Fire puzzle complete event to all listeners
	 * @param {Object} puzzle - Completed puzzle
	 */
	firePuzzleComplete: function(puzzle) {
		for (var i = 0; i < this.listeners.length; i++) {
			try {
				this.listeners[i](puzzle);
			} catch (e) {
				console.error("PuzzleEngine: Listener error:", e);
			}
		}
	},

	/**
	 * Get all puzzles for a chapter
	 * @param {number} chapter - Chapter number
	 * @returns {Array} - Array of puzzle objects
	 */
	getPuzzlesForChapter: function(chapter) {
		var result = [];
		for (var puzzleId in this.puzzles) {
			if (this.puzzles.hasOwnProperty(puzzleId)) {
				var puzzle = this.puzzles[puzzleId];
				if (puzzle.chapter === chapter) {
					result.push({
						id: puzzle.id,
						name: puzzle.name,
						description: puzzle.description,
						state: this.getPuzzleState(puzzleId)
					});
				}
			}
		}
		return result;
	},

	/**
	 * Get puzzle info by ID
	 * @param {string} puzzleId - Puzzle ID
	 * @returns {Object} - Puzzle info or null
	 */
	getPuzzle: function(puzzleId) {
		var puzzle = this.puzzles[puzzleId];
		if (!puzzle) return null;

		return {
			id: puzzle.id,
			name: puzzle.name,
			description: puzzle.description,
			chapter: puzzle.chapter,
			state: this.getPuzzleState(puzzleId),
			hints: puzzle.hints
		};
	},

	/**
	 * Get progress summary for a chapter
	 * @param {number} chapter - Chapter number
	 * @returns {Object} - { total, completed, available, locked }
	 */
	getChapterProgress: function(chapter) {
		var puzzles = this.getPuzzlesForChapter(chapter);
		var summary = {
			total: puzzles.length,
			completed: 0,
			available: 0,
			locked: 0
		};

		for (var i = 0; i < puzzles.length; i++) {
			switch (puzzles[i].state) {
				case HackerMystery.PuzzleEngine.STATE_COMPLETED:
					summary.completed++;
					break;
				case HackerMystery.PuzzleEngine.STATE_AVAILABLE:
					summary.available++;
					break;
				case HackerMystery.PuzzleEngine.STATE_LOCKED:
					summary.locked++;
					break;
			}
		}

		return summary;
	}
});
