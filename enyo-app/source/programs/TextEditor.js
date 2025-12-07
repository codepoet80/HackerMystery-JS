/**
 * HackerMystery.TextEditor
 *
 * Simple text viewer for reading files.
 * Handles encrypted files with password prompt.
 */
enyo.kind({
	name: "HackerMystery.TextEditor",
	kind: enyo.VFlexBox,
	className: "hm-texteditor",

	published: {
		filePath: "",
		fileName: ""
	},

	// File data
	fileData: null,
	isDecrypted: false,

	components: [
		// File info bar
		{name: "infoBar", kind: enyo.Control, className: "hm-texteditor-infobar",
			components: [
				{name: "fileNameLabel", kind: enyo.Control, className: "hm-texteditor-filename"}
			]
		},
		// Content area (scrollable)
		{name: "scroller", kind: enyo.Scroller, flex: 1, className: "hm-texteditor-scroller",
			components: [
				{name: "content", kind: enyo.Control, className: "hm-texteditor-content",
					allowHtml: true
				}
			]
		},
		// Password prompt (hidden by default)
		{name: "passwordPrompt", kind: enyo.Control, className: "hm-texteditor-password",
			showing: false,
			components: [
				{content: "This file is encrypted.", className: "hm-texteditor-password-label"},
				{name: "passwordInput", kind: enyo.Input, className: "hm-texteditor-password-input",
					placeholder: "Enter password...",
					onkeydown: "handlePasswordKeyDown"
				},
				{name: "decryptBtn", kind: enyo.Control, className: "hm-texteditor-password-btn",
					content: "[DECRYPT]",
					onclick: "attemptDecrypt"
				},
				{name: "passwordError", kind: enyo.Control, className: "hm-texteditor-password-error",
					showing: false,
					content: "Incorrect password."
				}
			]
		}
	],

	create: function() {
		this.inherited(arguments);
	},

	rendered: function() {
		this.inherited(arguments);
		if (this.filePath) {
			this.loadFile(this.filePath);
		}
	},

	/**
	 * Load a file by path
	 */
	loadFile: function(path) {
		this.filePath = path;
		this.isDecrypted = false;

		// Extract filename from path
		var parts = path.split("/");
		this.fileName = parts[parts.length - 1];
		this.$.fileNameLabel.setContent(this.fileName);

		// Read file from filesystem
		var fs = HackerMystery.FileSystem.getInstance();
		this.fileData = fs.readFile(path);

		if (!this.fileData) {
			this.showError("File not found: " + path);
			return;
		}

		if (this.fileData.locked) {
			this.showError("This file is locked.");
			return;
		}

		if (this.fileData.encrypted && this.fileData.password) {
			// Show encrypted content and password prompt
			this.showEncrypted();
		} else {
			// Show normal content
			this.showContent(this.fileData.content);

			// Set flag if file has onReadFlag
			if (this.fileData.onReadFlag) {
				var gameState = HackerMystery.GameState.getInstance();
				gameState.setFlag(this.fileData.onReadFlag, true);
			}
		}
	},

	/**
	 * Display normal text content
	 */
	showContent: function(text) {
		this.$.passwordPrompt.setShowing(false);

		// Escape HTML and preserve whitespace
		var escaped = this.escapeHtml(text);
		// Convert newlines to <br> for display
		escaped = escaped.replace(/\n/g, "<br>");

		this.$.content.setContent(escaped);
		this.$.scroller.scrollTo(0, 0);
	},

	/**
	 * Show encrypted file with password prompt
	 */
	showEncrypted: function() {
		// Show encrypted content (garbled)
		var escaped = this.escapeHtml(this.fileData.content);
		escaped = escaped.replace(/\n/g, "<br>");
		this.$.content.setContent(escaped);

		// Show password prompt
		this.$.passwordPrompt.setShowing(true);
		this.$.passwordError.setShowing(false);
		this.$.passwordInput.setValue("");
	},

	/**
	 * Show error message
	 */
	showError: function(message) {
		this.$.passwordPrompt.setShowing(false);
		this.$.content.setContent("<span class='hm-texteditor-error'>" + message + "</span>");
	},

	/**
	 * Handle Enter key in password field
	 */
	handlePasswordKeyDown: function(inSender, inEvent) {
		if (inEvent.keyCode === 13) {
			this.attemptDecrypt();
			inEvent.preventDefault();
			return true;
		}
	},

	/**
	 * Attempt to decrypt with entered password
	 */
	attemptDecrypt: function() {
		var enteredPassword = this.$.passwordInput.getValue().toLowerCase().trim();
		var correctPassword = this.fileData.password.toLowerCase();

		// Accept both singular and plural forms (e.g., "hacker" and "hackers")
		var passwordMatch = (enteredPassword === correctPassword) ||
			(correctPassword === "hackers" && enteredPassword === "hacker");

		if (passwordMatch) {
			// Success!
			this.isDecrypted = true;
			this.$.passwordPrompt.setShowing(false);

			// Show decrypted content
			if (this.fileData.decryptedContent) {
				this.showContent(this.fileData.decryptedContent);
			} else {
				this.showContent(this.fileData.content);
			}

			// Set game flag for decrypting this file (GameState.setFlag automatically notifies PuzzleEngine)
			var gameState = HackerMystery.GameState.getInstance();

			// Create flag without file extension
			var flagName = "decrypted_" + this.fileName.replace(/\.[^.]+$/, "");
			gameState.setFlag(flagName, true);

			// Special flag for the secrets file
			if (this.fileName === "too_many_secrets.enc") {
				gameState.setFlag("discovered_gibson_secret", true);
			}
		} else {
			// Wrong password
			this.$.passwordError.setShowing(true);
			this.$.passwordInput.setValue("");
		}
	},

	/**
	 * Escape HTML special characters
	 */
	escapeHtml: function(text) {
		var div = document.createElement("div");
		div.appendChild(document.createTextNode(text));
		return div.innerHTML;
	}
});
