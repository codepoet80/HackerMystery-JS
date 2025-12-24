/**
 * HackerMystery - Main Application Shell
 *
 * The root component that manages the game's main interface.
 * Renders a retro desktop environment with windowed programs.
 */
enyo.kind({
	name: "HackerMystery.App",
	kind: enyo.VFlexBox,
	className: "hm-app",

	// Track the currently focused window and its content
	focusedWindow: null,
	focusedContent: null,

	components: [
		// Menu bar at top
		{name: "menuBar", kind: "HackerMystery.MenuBar",
			onMenuAction: "handleMenuAction"
		},

		// Window manager handles all open windows
		{name: "windowManager", kind: "HackerMystery.WindowManager",
			onWindowFocused: "handleWindowFocused"
		},

		// Desktop with icons
		{name: "desktop", kind: "HackerMystery.Desktop", flex: 1,
			onLaunchProgram: "handleLaunchProgram"
		},

		// Alert modal overlay
		{name: "alertModal", kind: enyo.Control, className: "hm-alert-overlay", showing: false,
			onclick: "hideAlert",
			components: [
				{name: "alertBox", kind: enyo.Control, className: "hm-alert-box",
					onclick: "preventClose",
					components: [
						{name: "alertTitle", kind: enyo.Control, className: "hm-alert-title"},
						{name: "alertMessage", kind: enyo.Control, className: "hm-alert-message"},
						{name: "alertButton", kind: enyo.Control, className: "hm-alert-button",
							content: "[ OK ]",
							onclick: "hideAlert"
						}
					]
				}
			]
		}
	],

	create: function() {
		this.inherited(arguments);
		enyo.log("HackerMystery starting up...");

		// Enable fullscreen mode to hide webOS titlebar
		if (window.PalmSystem && window.PalmSystem.enableFullScreenMode) {
			window.PalmSystem.enableFullScreenMode(true);
		}

		// Initialize filesystem
		HackerMystery.FileSystem.getInstance();

		// Initialize sound manager (preloads sounds)
		HackerMystery.SoundManager.getInstance();

		// Initialize puzzle engine and listen for completions
		var self = this;
		var puzzleEngine = HackerMystery.PuzzleEngine.getInstance();
		puzzleEngine.addListener(function(puzzle) {
			self.onPuzzleComplete(puzzle);
		});
	},

	rendered: function() {
		this.inherited(arguments);

		// Update initial score display
		this.updateScoreDisplay();

		// Auto-launch terminal on startup for that authentic hacker feel
		// Delay to ensure app is fully initialized
		var self = this;
		setTimeout(function() {
			self.launchProgram("terminal");
		}, 500);
	},

	/**
	 * Called when a puzzle is completed
	 */
	onPuzzleComplete: function(puzzle) {
		enyo.log("Puzzle completed: " + puzzle.name);

		// Update score first (critical)
		this.updateScoreDisplay();

		// Play success sound (non-critical, wrapped in try-catch)
		try {
			var soundManager = HackerMystery.SoundManager.getInstance();
			if (soundManager) {
				soundManager.play("success.mp3");
			}
		} catch (e) {
			enyo.warn("Error playing success sound: " + e);
		}
	},

	/**
	 * Update the score display in the menu bar
	 */
	updateScoreDisplay: function() {
		var puzzleEngine = HackerMystery.PuzzleEngine.getInstance();
		var progress = puzzleEngine.getChapterProgress(1);
		this.$.menuBar.updateScore(progress.completed, progress.total);
	},

	/**
	 * Handle program launch requests from desktop icons
	 */
	handleLaunchProgram: function(inSender, inEvent) {
		enyo.log("App.handleLaunchProgram received: " + inEvent.program);
		this.launchProgram(inEvent.program);
	},

	/**
	 * Launch a program by name
	 */
	launchProgram: function(programName, options) {
		var self = this;
		var windowManager = this.$.windowManager;
		options = options || {};

		switch (programName) {
			case "terminal":
				windowManager.openWindow({
					title: "Terminal",
					kind: "HackerMystery.Terminal",
					width: 600,
					height: 384
				});
				break;

			case "files":
				var fileWindow = windowManager.openWindow({
					title: "Files",
					kind: "HackerMystery.FileViewer",
					width: 400,
					height: 350,
					left: 120,   // 20% more right (default is 50)
					top: 80,     // 10% more down (default is 50)
					onOpenFile: function(inSender, inEvent) {
						self.openFile(inEvent.path, inEvent.name);
					}
				});
				break;

			case "texteditor":
				windowManager.openWindow({
					title: options.fileName || "Text Editor",
					kind: "HackerMystery.TextEditor",
					width: 450,
					height: 350,
					contentOptions: {
						filePath: options.filePath,
						fileName: options.fileName
					}
				});
				break;

			case "network":
				// Network tool is locked until player discovers BBS info
				var gameState = HackerMystery.GameState.getInstance();
				if (gameState.getFlag("network_unlocked")) {
					// TODO: Launch BBS client when implemented
					enyo.log("Network tool not yet implemented");
				} else {
					// Show locked message in terminal or popup
					this.showLockedMessage("Network", "You need to find connection information first.");
				}
				break;

			default:
				enyo.log("Unknown program: " + programName);
		}
	},

	/**
	 * Open a file in the text editor
	 */
	openFile: function(filePath, fileName) {
		this.launchProgram("texteditor", {
			filePath: filePath,
			fileName: fileName
		});
	},

	/**
	 * Show a message when a program is locked
	 */
	showLockedMessage: function(programName, message) {
		this.showAlert(programName + " Locked", message);
	},

	/**
	 * Show an alert modal with title and message
	 */
	showAlert: function(title, message) {
		this.$.alertTitle.setContent(title);
		this.$.alertMessage.setContent(message);
		this.$.alertModal.setShowing(true);
	},

	/**
	 * Hide the alert modal
	 */
	hideAlert: function() {
		this.$.alertModal.setShowing(false);
		return true;
	},

	/**
	 * Prevent clicks on the alert box from closing the modal
	 */
	preventClose: function(inSender, inEvent) {
		inEvent.stopPropagation();
		return true;
	},

	/**
	 * Handle window focus changes from WindowManager
	 */
	handleWindowFocused: function(inSender, inEvent) {
		this.focusedWindow = inEvent.window;
		this.focusedContent = inEvent.content;

		// Update menu bar based on focused window type
		var contentKind = inEvent.contentKind || null;
		this.$.menuBar.setFocusedWindowType(contentKind);

		// If it's a FileViewer, update the Show Hidden state
		if (contentKind === "HackerMystery.FileViewer" && this.focusedContent) {
			this.$.menuBar.setShowHiddenState(this.focusedContent.showHidden || false);
		}

		return true;
	},

	/**
	 * Handle menu actions from MenuBar
	 */
	handleMenuAction: function(inSender, inEvent) {
		var action = inEvent.action;

		switch (action) {
			case "about":
				this.showAlert("Hacker Mystery 95", "Copyright 2026, codepoet");
				break;

			case "save":
				this.doSaveGame();
				break;

			case "load":
				this.doLoadGame();
				break;

			case "toggleHidden":
				this.toggleShowHiddenFiles();
				break;
		}

		return true;
	},

	/**
	 * Save game via menu
	 */
	doSaveGame: function() {
		var saveManager = HackerMystery.SaveManager.getInstance();
		var gameState = HackerMystery.GameState.getInstance();
		if (saveManager.saveGame(0, gameState)) {
			this.showAlert("Game Saved", "Your progress has been saved to slot 0.");
		} else {
			this.showAlert("Save Failed", "Could not save your game.");
		}
	},

	/**
	 * Load game via menu
	 */
	doLoadGame: function() {
		var saveManager = HackerMystery.SaveManager.getInstance();
		var gameState = HackerMystery.GameState.getInstance();
		var data = saveManager.loadGame(0);
		if (data) {
			gameState.fromJSON(data);
			this.showAlert("Game Loaded", "Your progress has been restored from slot 0.");
		} else {
			this.showAlert("Load Failed", "No saved game found in slot 0.");
		}
	},

	/**
	 * Toggle show hidden files in focused FileViewer
	 */
	toggleShowHiddenFiles: function() {
		if (this.focusedContent && this.focusedContent.toggleShowHidden) {
			var newState = this.focusedContent.toggleShowHidden();
			this.$.menuBar.setShowHiddenState(newState);
		}
	}
});
