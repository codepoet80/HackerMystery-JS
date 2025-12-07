/**
 * HackerMystery.Terminal
 *
 * Terminal emulator component with command input and output.
 * Features typewriter effect and command history.
 */
enyo.kind({
	name: "HackerMystery.Terminal",
	kind: enyo.VFlexBox,
	className: "hm-terminal",

	// Command history
	history: null,
	historyIndex: -1,
	maxHistory: 50,

	// Typewriter effect state
	typewriterQueue: null,
	typewriterTimer: null,
	typewriterSpeed: 20,  // ms per character

	// Built-in commands
	commands: null,

	// BBS session state
	bbsConnected: false,
	bbsWaitingForKey: false,

	components: [
		// Output area
		{name: "outputScroller", kind: enyo.Scroller, flex: 1,
			className: "hm-terminal-output-scroller",
			components: [
				{name: "output", kind: enyo.Control, className: "hm-terminal-output",
					allowHtml: true
				}
			]
		},
		// Input area
		{name: "inputRow", kind: enyo.HFlexBox, className: "hm-terminal-input-row",
			components: [
				{name: "prompt", kind: enyo.Control, className: "hm-terminal-prompt",
					content: ">"
				},
				{name: "input", kind: enyo.Input, flex: 1,
					className: "hm-terminal-input",
					onkeydown: "handleKeyDown",
					onchange: "handleInputChange"
				}
			]
		}
	],

	create: function() {
		this.inherited(arguments);
		this.history = [];
		this.typewriterQueue = [];
		this.dialingInProgress = false;
		this.initCommands();
	},

	rendered: function() {
		this.inherited(arguments);
		// Show welcome message
		this.printWelcome();
		// Focus input
		this.focusInput();
	},

	/**
	 * Initialize built-in commands
	 */
	initCommands: function() {
		var self = this;
		this.commands = {
			help: {
				description: "Show available commands",
				handler: function(args) {
					var output = "Available commands:\n";
					var cmds = Object.keys(self.commands);
					for (var i = 0; i < cmds.length; i++) {
						var cmd = cmds[i];
						output += "  " + cmd + " - " + self.commands[cmd].description + "\n";
					}
					return output;
				}
			},
			clear: {
				description: "Clear the terminal",
				handler: function(args) {
					self.clearOutput();
					return null;  // No output to print
				}
			},
			echo: {
				description: "Print text to terminal",
				handler: function(args) {
					return args.join(" ");
				}
			},
			whoami: {
				description: "Display current user",
				handler: function(args) {
					return "guest@darknet";
				}
			},
			date: {
				description: "Show current date and time",
				handler: function(args) {
					// Always show a date in April 1995 for immersion
					var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
					var day = 23
					var dayOfWeek = "Sunday"
					var now = new Date();
					var hour = now.getHours();
					var min = now.getMinutes();
					var pad = function(n) { return n < 10 ? "0" + n : "" + n; };
					return dayOfWeek + " July " + day + " 1995 " + pad(hour) + ":" + pad(min);
				}
			},
			about: {
				description: "About this system",
				handler: function(args) {
					return "HackerMystery Terminal v0.1\n" +
						"A conspiracy lurks in the shadows...\n" +
						"Type 'help' for available commands.";
				}
			},
			dial: {
				description: "Dial a BBS (e.g., dial 555-2638)",
				handler: function(args) {
					if (args.length === 0) {
						return "Usage: dial <phone-number>\n" +
							"Example: dial 555-2638";
					}
					var phoneNumber = args.join("");

					// Check for proper phone number format (must contain a dash)
					if (phoneNumber.indexOf("-") === -1) {
						return "Invalid phone number format.\n" +
							"Please use format: XXX-XXXX\n" +
							"Example: dial 555-2638";
					}

					// Check if this number exists to determine which sound to play
					var bbsData = HackerMystery.BBSData.getInstance();
					var bbs = bbsData.getBBS(phoneNumber);
					// Use BBS-specific dial sound, or dialup-fail.mp3 for unknown numbers
					var dialSound = bbs ? (bbs.dialSound || "dialup-fail.mp3") : "dialup-fail.mp3";

					// Disable input while dialing
					self.dialingInProgress = true;
					self.$.input.setDisabled(true);

					// Play dialup sound and wait for it to finish
					var soundManager = HackerMystery.SoundManager.getInstance();
					soundManager.play(dialSound, {
						onEnded: function() {
							// Sound finished, now actually connect
							var bbsHandler = HackerMystery.BBSHandler.getInstance();
							var result = bbsHandler.dial(phoneNumber, self);

							if (result.success) {
								self.bbsConnected = true;
								if (result.needsInput) {
									// Password prompt
									self.$.prompt.setContent(">");
								}

								// Play connect sound if specified (e.g., victory sound)
								if (bbs && bbs.connectSound) {
									soundManager.play(bbs.connectSound);
								}
							}

							// Print the connection result
							self.println(result.message);

							// Re-enable input
							self.dialingInProgress = false;
							self.$.input.setDisabled(false);
							self.focusInput();
						}
					});

					// Return initial dialing message
					return "Dialing " + phoneNumber + "...";
				}
			},
			hangup: {
				description: "Disconnect from current BBS",
				handler: function(args) {
					var bbsHandler = HackerMystery.BBSHandler.getInstance();
					if (!bbsHandler.isConnected()) {
						return "Not connected to any BBS.";
					}
					var result = bbsHandler.disconnect();
					self.bbsConnected = false;
					self.$.prompt.setContent(">");
					return result.message;
				}
			}
		};
	},

	/**
	 * Print welcome message
	 */
	printWelcome: function() {
		var welcome =
			"================================\n" +
			"  DARKNET TERMINAL v2.1.4\n" +
			"  (c) 1995 CyberSys Industries\n" +
			"================================\n" +
			"\n" +
			"Connection established.\n" +
			"Type 'help' for commands.\n" +
			"\n";

		this.print(welcome, true);  // Use typewriter effect
	},

	/**
	 * Print text to terminal output
	 * @param {string} text - Text to print
	 * @param {boolean} typewriter - Use typewriter effect
	 */
	print: function(text, typewriter) {
		if (typewriter) {
			this.queueTypewriter(text);
		} else {
			this.appendOutput(text);
		}
	},

	/**
	 * Print a line with newline
	 */
	println: function(text, typewriter) {
		this.print(text + "\n", typewriter);
	},

	/**
	 * Append text directly to output
	 */
	appendOutput: function(text) {
		var current = this.$.output.getContent();
		// Escape HTML but preserve newlines
		var escaped = this.escapeHtml(text);
		escaped = escaped.replace(/\n/g, "<br>");
		this.$.output.setContent(current + escaped);
		this.scrollToBottom();
	},

	/**
	 * Queue text for typewriter effect
	 */
	queueTypewriter: function(text) {
		// Add text to queue
		for (var i = 0; i < text.length; i++) {
			this.typewriterQueue.push(text[i]);
		}

		// Start typewriter if not running
		if (!this.typewriterTimer) {
			this.runTypewriter();
		}
	},

	/**
	 * Run typewriter effect
	 */
	runTypewriter: function() {
		var self = this;

		if (this.typewriterQueue.length === 0) {
			this.typewriterTimer = null;
			return;
		}

		var char = this.typewriterQueue.shift();
		this.appendOutput(char);

		this.typewriterTimer = setTimeout(function() {
			self.runTypewriter();
		}, this.typewriterSpeed);
	},

	/**
	 * Clear terminal output
	 */
	clearOutput: function() {
		this.$.output.setContent("");
	},

	/**
	 * Scroll output to bottom
	 */
	scrollToBottom: function() {
		var scroller = this.$.outputScroller;
		// Use setTimeout to ensure DOM is updated
		setTimeout(function() {
			scroller.scrollToBottom();
		}, 10);
	},

	/**
	 * Focus the input field
	 */
	focusInput: function() {
		var inputNode = this.$.input.hasNode();
		if (inputNode) {
			inputNode.focus();
		}
	},

	/**
	 * Handle key down in input
	 */
	handleKeyDown: function(inSender, inEvent) {
		var keyCode = inEvent.keyCode;

		// Enter - execute command
		if (keyCode === 13) {
			this.executeCurrentInput();
			inEvent.preventDefault();
			return true;
		}

		// Up arrow - history previous
		if (keyCode === 38) {
			this.historyPrevious();
			inEvent.preventDefault();
			return true;
		}

		// Down arrow - history next
		if (keyCode === 40) {
			this.historyNext();
			inEvent.preventDefault();
			return true;
		}

		return false;
	},

	/**
	 * Handle input change (for mobile keyboards that don't fire keydown)
	 */
	handleInputChange: function(inSender, inEvent) {
		// Check if input ends with newline (some mobile keyboards)
		var value = this.$.input.getValue();
		if (value.indexOf("\n") >= 0) {
			this.$.input.setValue(value.replace(/\n/g, ""));
			this.executeCurrentInput();
		}
	},

	/**
	 * Execute the current input command
	 */
	executeCurrentInput: function() {
		// Ignore input while dialing
		if (this.dialingInProgress) {
			this.$.input.setValue("");
			return;
		}

		var input = this.$.input.getValue().trim();
		this.$.input.setValue("");

		if (input === "") return;

		// Add to history
		this.history.push(input);
		if (this.history.length > this.maxHistory) {
			this.history.shift();
		}
		this.historyIndex = this.history.length;

		// Echo command
		this.println("> " + input);

		// Execute
		this.executeCommand(input);
	},

	/**
	 * Execute a command string
	 */
	executeCommand: function(input) {
		var bbsHandler = HackerMystery.BBSHandler.getInstance();

		// If waiting for any key, any input continues
		if (this.bbsWaitingForKey) {
			this.bbsWaitingForKey = false;
			this.$.prompt.setContent(">");
			var result = bbsHandler.handleInput("");
			if (result.message) {
				this.println(result.message);
			}
			if (result.disconnected) {
				this.bbsConnected = false;
				this.$.prompt.setContent(">");
			}
			return;
		}

		// If connected to BBS, route input to BBS handler
		if (bbsHandler.isConnected()) {
			var result = bbsHandler.handleInput(input);

			if (result.message) {
				this.println(result.message);
			}

			if (result.disconnected) {
				this.bbsConnected = false;
				this.$.prompt.setContent(">");
			} else if (result.waitForKey) {
				this.bbsWaitingForKey = true;
			} else {
				// Update prompt based on state
				this.$.prompt.setContent(">");
			}
			return;
		}

		// Normal command processing
		var parts = input.split(/\s+/);
		var cmd = parts[0].toLowerCase();
		var args = parts.slice(1);

		if (this.commands[cmd]) {
			var result = this.commands[cmd].handler(args);
			if (result !== null && result !== undefined) {
				this.println(result);
			}
		} else {
			this.println("Unknown command: " + cmd);
			this.println("Type 'help' for available commands.");
		}
	},

	/**
	 * Navigate to previous history entry
	 */
	historyPrevious: function() {
		if (this.historyIndex > 0) {
			this.historyIndex--;
			this.$.input.setValue(this.history[this.historyIndex]);
		}
	},

	/**
	 * Navigate to next history entry
	 */
	historyNext: function() {
		if (this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
			this.$.input.setValue(this.history[this.historyIndex]);
		} else {
			this.historyIndex = this.history.length;
			this.$.input.setValue("");
		}
	},

	/**
	 * Escape HTML special characters
	 */
	escapeHtml: function(text) {
		var div = document.createElement("div");
		div.appendChild(document.createTextNode(text));
		return div.innerHTML;
	},

	destroy: function() {
		// Clean up typewriter timer
		if (this.typewriterTimer) {
			clearTimeout(this.typewriterTimer);
		}
		this.inherited(arguments);
	}
});
