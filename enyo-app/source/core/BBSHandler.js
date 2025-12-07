/**
 * HackerMystery.BBSHandler
 *
 * Handles BBS session state and command processing.
 * Works with the Terminal to provide an interactive BBS experience.
 */
enyo.kind({
	name: "HackerMystery.BBSHandler",
	kind: enyo.Component,

	statics: {
		instance: null,
		getInstance: function() {
			if (!HackerMystery.BBSHandler.instance) {
				HackerMystery.BBSHandler.instance = new HackerMystery.BBSHandler();
			}
			return HackerMystery.BBSHandler.instance;
		},

		// Session states
		STATE_DISCONNECTED: "disconnected",
		STATE_PASSWORD: "password",
		STATE_MAIN_MENU: "main_menu",
		STATE_BOARDS: "boards",
		STATE_READING_BOARD: "reading_board",
		STATE_READING_MESSAGE: "reading_message",
		STATE_EMAIL: "email",
		STATE_READING_EMAIL: "reading_email",
		STATE_COMPOSING: "composing",
		STATE_COMPOSING_BOARD: "composing_board"
	},

	// Current session
	currentBBS: null,
	sessionState: "disconnected",
	currentBoard: null,
	currentMessage: null,
	currentEmail: null,
	replyContext: null,

	// Reference to terminal (set when connecting)
	terminal: null,

	// Pending email replies (queued until user returns to main menu)
	pendingEmails: null,

	// Flag to show new mail notification
	hasNewMail: false,

	create: function() {
		this.inherited(arguments);
		this.sessionState = HackerMystery.BBSHandler.STATE_DISCONNECTED;
		this.pendingEmails = [];
		this.pendingBoardReplies = [];
	},

	/**
	 * Check if currently connected to a BBS
	 */
	isConnected: function() {
		return this.sessionState !== HackerMystery.BBSHandler.STATE_DISCONNECTED;
	},

	/**
	 * Attempt to dial a BBS
	 * @param {string} phoneNumber - Phone number to dial
	 * @param {object} terminal - Terminal instance for output
	 * @returns {boolean} - True if connection initiated
	 */
	dial: function(phoneNumber, terminal) {
		this.terminal = terminal;

		// Normalize phone number
		phoneNumber = phoneNumber.replace(/[^\d-]/g, "");

		var bbsData = HackerMystery.BBSData.getInstance();
		var bbs = bbsData.getBBS(phoneNumber);

		if (!bbs) {
			return {
				success: false,
				message: "NO CARRIER\n\nThe number you dialed does not answer."
			};
		}

		// Check if BBS is active
		if (!bbs.active) {
			return {
				success: false,
				message: bbs.deadMessage ? bbs.deadMessage.join("\n") : "NO CARRIER"
			};
		}

		// Check if player is banned
		if (bbs.banned) {
			return {
				success: false,
				message: bbs.banMessage ? bbs.banMessage.join("\n") : "ACCESS DENIED"
			};
		}

		// Check if BBS requires a flag
		if (bbs.requiresFlag) {
			var gameState = HackerMystery.GameState.getInstance();
			if (!gameState.getFlag(bbs.requiresFlag)) {
				return {
					success: false,
					message: bbs.lockedMessage ? bbs.lockedMessage.join("\n") : "NO CARRIER"
				};
			}
		}

		// Start connection
		this.currentBBS = bbs;

		// Check if password required
		if (bbs.password) {
			this.sessionState = HackerMystery.BBSHandler.STATE_PASSWORD;
			return {
				success: true,
				message: "CONNECT 2400\n\nConnected to " + bbs.name + "\n\nPassword: ",
				needsInput: true,
				inputType: "password"
			};
		} else {
			// No password, go straight to main menu
			this.sessionState = HackerMystery.BBSHandler.STATE_MAIN_MENU;
			return {
				success: true,
				message: this.getConnectMessage()
			};
		}
	},

	/**
	 * Get connect message with ASCII art
	 */
	getConnectMessage: function() {
		var lines = ["CONNECT 2400", ""];

		if (this.currentBBS.welcomeArt) {
			lines = lines.concat(this.currentBBS.welcomeArt);
		} else {
			lines.push("Connected to " + this.currentBBS.name);
			lines.push("");
		}

		lines.push(this.getMainMenu());

		return lines.join("\n");
	},

	/**
	 * Get main menu text
	 */
	getMainMenu: function() {
		var menu = [
			"================================",
			"         MAIN MENU",
			"================================",
			""
		];

		menu.push("  [B] Message Boards");

		// Show new mail indicator
		if (this.hasNewMail) {
			menu.push("  [E] Email  *** NEW MAIL ***");
		} else {
			menu.push("  [E] Email");
		}

		menu.push("  [W] Who's Online");
		menu.push("  [H] Help");
		menu.push("  [G] Goodbye (disconnect)");
		menu.push("");
		menu.push("Enter choice: ");

		return menu.join("\n");
	},

	/**
	 * Handle input while connected to BBS
	 * @param {string} input - User input
	 * @returns {object} - Response with message and state info
	 */
	handleInput: function(input) {
		input = input.trim();

		switch (this.sessionState) {
			case HackerMystery.BBSHandler.STATE_PASSWORD:
				return this.handlePassword(input);

			case HackerMystery.BBSHandler.STATE_MAIN_MENU:
				return this.handleMainMenu(input);

			case HackerMystery.BBSHandler.STATE_BOARDS:
				return this.handleBoardsList(input);

			case HackerMystery.BBSHandler.STATE_READING_BOARD:
				return this.handleReadingBoard(input);

			case HackerMystery.BBSHandler.STATE_READING_MESSAGE:
				return this.handleReadingMessage(input);

			case HackerMystery.BBSHandler.STATE_EMAIL:
				return this.handleEmail(input);

			case HackerMystery.BBSHandler.STATE_READING_EMAIL:
				return this.handleReadingEmail(input);

			case HackerMystery.BBSHandler.STATE_COMPOSING:
				return this.handleComposing(input);

			case HackerMystery.BBSHandler.STATE_COMPOSING_BOARD:
				return this.handleComposingBoard(input);

			default:
				return { message: "ERROR: Unknown state" };
		}
	},

	/**
	 * Handle password entry
	 */
	handlePassword: function(input) {
		if (input.toLowerCase() === this.currentBBS.password.toLowerCase()) {
			this.sessionState = HackerMystery.BBSHandler.STATE_MAIN_MENU;
			return {
				message: "\nAccess granted!\n\n" + this.getConnectMessage()
			};
		} else {
			this.disconnect();
			return {
				message: "\nAccess denied.\n\nNO CARRIER",
				disconnected: true
			};
		}
	},

	/**
	 * Handle main menu selection
	 */
	handleMainMenu: function(input) {
		var choice = input.toUpperCase();

		switch (choice) {
			case "B":
				return this.showBoards();

			case "E":
				// Clear new mail flag when checking email
				this.hasNewMail = false;
				return this.showEmail();

			case "W":
				return this.showWhosOnline();

			case "H":
				return this.showHelp();

			case "G":
				return this.disconnect();

			default:
				return {
					message: "Invalid choice. Try again.\n\n" + this.getMainMenu()
				};
		}
	},

	/**
	 * Queue an email reply for later delivery
	 */
	queueEmailReply: function(email) {
		this.pendingEmails.push(email);
	},

	/**
	 * Deliver any pending emails and board replies, return notification text
	 */
	deliverPendingEmails: function() {
		var notifications = [];

		// Deliver pending board replies
		if (this.pendingBoardReplies && this.pendingBoardReplies.length > 0) {
			for (var i = 0; i < this.pendingBoardReplies.length; i++) {
				var pending = this.pendingBoardReplies[i];
				var board = this.currentBBS.boards[pending.boardId];
				if (board && board.messages) {
					board.messages.push(pending.message);
				}
			}
			var boardCount = this.pendingBoardReplies.length;
			notifications.push("*** " + boardCount + " new board post" + (boardCount > 1 ? "s" : "") + " ***");
			this.pendingBoardReplies = [];
		}

		// Deliver pending emails
		if (this.pendingEmails.length > 0) {
			var bbs = this.currentBBS;

			// Add pending emails to the BBS email system
			if (!bbs.deliveredEmails) {
				bbs.deliveredEmails = [];
			}

			for (var j = 0; j < this.pendingEmails.length; j++) {
				bbs.deliveredEmails.push(this.pendingEmails[j]);
			}

			var emailCount = this.pendingEmails.length;
			this.pendingEmails = [];
			this.hasNewMail = true;
			notifications.push("*** " + emailCount + " new email" + (emailCount > 1 ? "s" : "") + " ***");
		}

		if (notifications.length === 0) {
			return "";
		}

		return "\n" + notifications.join("\n") + "\n";
	},

	/**
	 * Return to main menu with pending email delivery
	 */
	returnToMainMenu: function() {
		this.sessionState = HackerMystery.BBSHandler.STATE_MAIN_MENU;

		var notification = this.deliverPendingEmails();
		return {
			message: notification + "\n" + this.getMainMenu()
		};
	},

	/**
	 * Show message boards list
	 */
	showBoards: function() {
		this.sessionState = HackerMystery.BBSHandler.STATE_BOARDS;

		var lines = [
			"",
			"================================",
			"      MESSAGE BOARDS",
			"================================",
			""
		];

		var gameState = HackerMystery.GameState.getInstance();
		var boards = this.currentBBS.boards || {};
		var boardIds = Object.keys(boards);
		var visibleBoards = [];

		for (var i = 0; i < boardIds.length; i++) {
			var boardId = boardIds[i];
			var board = boards[boardId];

			// Check if board requires a flag
			if (board.requiresFlag && !gameState.getFlag(board.requiresFlag)) {
				continue;
			}

			visibleBoards.push({ id: boardId, board: board });
			lines.push("  [" + visibleBoards.length + "] " + board.name +
				" (" + (board.messages ? board.messages.length : 0) + " msgs)");
		}

		if (visibleBoards.length === 0) {
			lines.push("  No boards available.");
		}

		lines.push("");
		lines.push("  [M] Main Menu");
		lines.push("");
		lines.push("Enter choice: ");

		this._visibleBoards = visibleBoards;

		return { message: lines.join("\n") };
	},

	/**
	 * Handle board list selection
	 */
	handleBoardsList: function(input) {
		if (input.toUpperCase() === "M") {
			return this.returnToMainMenu();
		}

		var boardNum = parseInt(input, 10);
		if (isNaN(boardNum) || boardNum < 1 || boardNum > this._visibleBoards.length) {
			return { message: "Invalid choice. Enter a board number or M for menu: " };
		}

		var selected = this._visibleBoards[boardNum - 1];
		this.currentBoard = selected.id;
		return this.showBoardMessages(selected.board);
	},

	/**
	 * Show messages in a board
	 */
	showBoardMessages: function(board) {
		this.sessionState = HackerMystery.BBSHandler.STATE_READING_BOARD;

		var lines = [
			"",
			"================================",
			"  " + board.name.toUpperCase(),
			"================================",
			""
		];

		var messages = board.messages || [];
		if (messages.length === 0) {
			lines.push("  No messages.");
		} else {
			for (var i = 0; i < messages.length; i++) {
				var msg = messages[i];
				lines.push("  [" + (i + 1) + "] " + msg.subject);
				lines.push("      From: " + msg.from + " - " + msg.date);
			}
		}

		lines.push("");
		lines.push("  [B] Back to boards");
		lines.push("  [M] Main Menu");
		lines.push("");
		lines.push("Enter message # to read: ");

		this._currentBoardMessages = messages;

		return { message: lines.join("\n") };
	},

	/**
	 * Handle reading board (selecting message)
	 */
	handleReadingBoard: function(input) {
		if (input.toUpperCase() === "M") {
			return this.returnToMainMenu();
		}

		if (input.toUpperCase() === "B") {
			return this.showBoards();
		}

		var msgNum = parseInt(input, 10);
		if (isNaN(msgNum) || msgNum < 1 || msgNum > this._currentBoardMessages.length) {
			return { message: "Invalid choice. Enter a message # or B/M: " };
		}

		var msg = this._currentBoardMessages[msgNum - 1];
		return this.showMessage(msg);
	},

	/**
	 * Show a single message
	 */
	showMessage: function(msg) {
		this.sessionState = HackerMystery.BBSHandler.STATE_READING_MESSAGE;
		this.currentMessage = msg;

		// Handle onRead trigger (queue email when message is read)
		if (msg.onRead && !msg.onReadTriggered) {
			msg.onReadTriggered = true;

			if (msg.onRead.queueEmail) {
				var emailData = msg.onRead.queueEmail;
				var responseEmail = {
					id: Date.now(),
					from: emailData.from,
					date: "03/15/95",
					subject: emailData.subject,
					read: false,
					body: emailData.body,
					replies: emailData.replies || []
				};
				this.queueEmailReply(responseEmail);
			}
		}

		// Mark as no longer new
		msg.isNew = false;

		var lines = [
			"",
			"--------------------------------",
			"From: " + msg.from,
			"Date: " + msg.date,
			"Subject: " + msg.subject,
			"--------------------------------",
			""
		];

		lines = lines.concat(msg.body);
		lines.push("");
		lines.push("--------------------------------");

		// Check if message can be replied to (and hasn't been already)
		var gameState = HackerMystery.GameState.getInstance();
		var canReply = msg.canReply && msg.replyResponse && msg.replyResponse.setsFlags;
		if (canReply) {
			// Check if already replied (any of the flags already set)
			var alreadyReplied = false;
			for (var i = 0; i < msg.replyResponse.setsFlags.length; i++) {
				if (gameState.getFlag(msg.replyResponse.setsFlags[i])) {
					alreadyReplied = true;
					break;
				}
			}
			if (!alreadyReplied) {
				lines.push("[R] Reply  [B] Back  [M] Main Menu");
			} else {
				lines.push("[B] Back  [M] Main Menu");
			}
		} else {
			lines.push("[B] Back  [M] Main Menu");
		}
		lines.push("");

		return { message: lines.join("\n") };
	},

	/**
	 * Handle reading message
	 */
	handleReadingMessage: function(input) {
		var choice = input.toUpperCase();

		if (choice === "M") {
			return this.returnToMainMenu();
		}

		if (choice === "B") {
			var board = this.currentBBS.boards[this.currentBoard];
			return this.showBoardMessages(board);
		}

		if (choice === "R" && this.currentMessage.canReply && this.currentMessage.replyResponse) {
			// Check if already replied
			var gameState = HackerMystery.GameState.getInstance();
			var alreadyReplied = false;
			if (this.currentMessage.replyResponse.setsFlags) {
				for (var i = 0; i < this.currentMessage.replyResponse.setsFlags.length; i++) {
					if (gameState.getFlag(this.currentMessage.replyResponse.setsFlags[i])) {
						alreadyReplied = true;
						break;
					}
				}
			}

			if (!alreadyReplied) {
				this.sessionState = HackerMystery.BBSHandler.STATE_COMPOSING_BOARD;
				var prompt = this.currentMessage.replyPrompt || "Enter your reply:";
				return {
					message: "\n" +
						"--------------------------------\n" +
						"  COMPOSE REPLY\n" +
						"--------------------------------\n" +
						"To: " + this.currentMessage.from + "\n" +
						"Subject: RE: " + this.currentMessage.subject + "\n" +
						"--------------------------------\n" +
						"\n" +
						prompt + "\n" +
						"> "
				};
			}
		}

		return { message: "Invalid choice: " };
	},

	/**
	 * Handle composing board reply
	 */
	handleComposingBoard: function(input) {
		if (!this.currentMessage || !this.currentMessage.replyResponse) {
			this.sessionState = HackerMystery.BBSHandler.STATE_READING_BOARD;
			var board = this.currentBBS.boards[this.currentBoard];
			return this.showBoardMessages(board);
		}

		var response = this.currentMessage.replyResponse;
		var board = this.currentBBS.boards[this.currentBoard];

		// Set flags (GameState.setFlag automatically notifies PuzzleEngine)
		if (response.setsFlags) {
			var gameState = HackerMystery.GameState.getInstance();

			for (var i = 0; i < response.setsFlags.length; i++) {
				var flag = response.setsFlags[i];
				gameState.setFlag(flag, true);
			}
		}

		// Add user's post to the board if specified
		if (response.addUserPost) {
			var userPost = {
				id: Date.now(),
				from: "guest",
				date: "03/15/95",
				subject: "RE: " + this.currentMessage.subject,
				body: [input || "(No message)"],
				isUserPost: true
			};
			board.messages.push(userPost);
		}

		// Queue board reply if specified (will appear when returning to main menu)
		if (response.queueBoardReply) {
			var replyData = response.queueBoardReply;
			var boardReply = {
				id: Date.now() + 1,
				from: replyData.from,
				date: "03/15/95",
				subject: replyData.subject,
				body: replyData.body,
				onRead: replyData.onRead,  // Preserve onRead trigger
				isNew: true  // Mark as new/unread
			};
			this.queueBoardReply(this.currentBoard, boardReply);
		}

		// Mark message as replied (disable further replies)
		this.currentMessage.canReply = false;

		// Return to board list with simple confirmation
		this.sessionState = HackerMystery.BBSHandler.STATE_READING_BOARD;

		return {
			message: "\nYour reply has been posted.\n\n" +
				"[B] Back to messages  [M] Main Menu\n"
		};
	},

	/**
	 * Queue a board reply for delivery when returning to main menu
	 */
	queueBoardReply: function(boardId, message) {
		if (!this.pendingBoardReplies) {
			this.pendingBoardReplies = [];
		}
		this.pendingBoardReplies.push({
			boardId: boardId,
			message: message
		});
	},

	/**
	 * Show email inbox
	 */
	showEmail: function() {
		this.sessionState = HackerMystery.BBSHandler.STATE_EMAIL;

		var bbsData = HackerMystery.BBSData.getInstance();
		var emails = bbsData.getEmailForBBS(this.currentBBS.id);

		// Add any delivered emails from replies
		if (this.currentBBS.deliveredEmails) {
			emails = emails.concat(this.currentBBS.deliveredEmails);
		}

		var lines = [
			"",
			"================================",
			"         YOUR MAILBOX",
			"================================",
			""
		];

		if (emails.length === 0) {
			lines.push("  No messages.");
		} else {
			for (var i = 0; i < emails.length; i++) {
				var email = emails[i];
				var readMarker = email.read ? " " : "*";
				lines.push("  " + readMarker + "[" + (i + 1) + "] " + email.subject);
				lines.push("       From: " + email.from + " - " + email.date);
			}
		}

		lines.push("");
		lines.push("  * = unread");
		lines.push("");
		lines.push("  [M] Main Menu");
		lines.push("");
		lines.push("Enter message # to read: ");

		this._currentEmails = emails;

		return { message: lines.join("\n") };
	},

	/**
	 * Handle email list
	 */
	handleEmail: function(input) {
		if (input.toUpperCase() === "M") {
			return this.returnToMainMenu();
		}

		var msgNum = parseInt(input, 10);
		if (isNaN(msgNum) || msgNum < 1 || msgNum > this._currentEmails.length) {
			return { message: "Invalid choice. Enter a message # or M: " };
		}

		var email = this._currentEmails[msgNum - 1];
		email.read = true;
		return this.showEmailMessage(email);
	},

	/**
	 * Show email message
	 */
	showEmailMessage: function(email) {
		this.sessionState = HackerMystery.BBSHandler.STATE_READING_EMAIL;
		this.currentEmail = email;

		var lines = [
			"",
			"--------------------------------",
			"From: " + email.from,
			"Date: " + email.date,
			"Subject: " + email.subject,
			"--------------------------------",
			""
		];

		lines = lines.concat(email.body);
		lines.push("");
		lines.push("--------------------------------");

		if (email.replies && email.replies.length > 0) {
			lines.push("[R] Reply  [B] Back  [M] Main Menu");
		} else {
			lines.push("[B] Back  [M] Main Menu");
		}
		lines.push("");

		return { message: lines.join("\n") };
	},

	/**
	 * Handle reading email
	 */
	handleReadingEmail: function(input) {
		var choice = input.toUpperCase();

		if (choice === "M") {
			return this.returnToMainMenu();
		}

		if (choice === "B") {
			return this.showEmail();
		}

		if (choice === "R" && this.currentEmail.replies && this.currentEmail.replies.length > 0) {
			this.sessionState = HackerMystery.BBSHandler.STATE_COMPOSING;
			this.replyContext = this.currentEmail;
			return {
				message: "\n" +
					"--------------------------------\n" +
					"  COMPOSE REPLY\n" +
					"--------------------------------\n" +
					"To: " + this.currentEmail.from + "\n" +
					"Subject: RE: " + this.currentEmail.subject + "\n" +
					"--------------------------------\n" +
					"\n" +
					"Enter your reply (single line):\n" +
					"> "
			};
		}

		return { message: "Invalid choice: " };
	},

	/**
	 * Handle composing reply
	 */
	handleComposing: function(input) {
		if (!this.replyContext || !this.replyContext.replies) {
			this.sessionState = HackerMystery.BBSHandler.STATE_EMAIL;
			return { message: "Error. Returning to email.\n" + this.showEmail().message };
		}

		// Check for trigger words in the reply
		var inputLower = input.toLowerCase();
		var matchedReply = null;

		for (var i = 0; i < this.replyContext.replies.length; i++) {
			var replyOption = this.replyContext.replies[i];
			if (inputLower.indexOf(replyOption.trigger.toLowerCase()) !== -1) {
				matchedReply = replyOption;
				break;
			}
		}

		if (matchedReply) {
			// Apply flags from the reply (GameState.setFlag automatically notifies PuzzleEngine)
			if (matchedReply.response.setsFlags) {
				var gameState = HackerMystery.GameState.getInstance();

				for (var j = 0; j < matchedReply.response.setsFlags.length; j++) {
					var flag = matchedReply.response.setsFlags[j];
					gameState.setFlag(flag, true);
				}
			}

			// Queue the response email for delivery when returning to main menu
			var responseEmail = {
				id: Date.now(),
				from: matchedReply.response.from,
				date: "03/15/95",
				subject: matchedReply.response.subject,
				read: false,
				body: matchedReply.response.body,
				replies: []  // No further replies on response emails
			};
			this.queueEmailReply(responseEmail);

			// Mark original email as handled (remove reply option)
			this.replyContext.replies = [];
			this.replyContext = null;
			this.sessionState = HackerMystery.BBSHandler.STATE_EMAIL;

			return {
				message: "\nMessage sent!\n\n" +
					"[B] Back to Email  [M] Main Menu\n"
			};
		} else {
			// No trigger matched - still send the message but no queued reply
			this.replyContext = null;
			this.sessionState = HackerMystery.BBSHandler.STATE_EMAIL;

			return {
				message: "\nMessage sent.\n\n" +
					"[B] Back to Email  [M] Main Menu\n"
			};
		}
	},

	/**
	 * Show who's online
	 */
	showWhosOnline: function() {
		var lines = [
			"",
			"================================",
			"       WHO'S ONLINE",
			"================================",
			"",
			"  Handle          Idle",
			"  ------          ----",
			"  Acid Burn       2m",
			"  PhantomPhreak   15m",
			"  CerealKiller    5m",
			"  guest           0m  <-- You",
			"",
			"  4 users online",
			"",
			"[Press any key for menu]",
			""
		];

		return { message: lines.join("\n"), waitForKey: true };
	},

	/**
	 * Show help
	 */
	showHelp: function() {
		var lines = [
			"",
			"================================",
			"          BBS HELP",
			"================================",
			"",
			"Navigation:",
			"  Enter the letter or number shown",
			"  in brackets to make a selection.",
			"",
			"  [M] always returns to Main Menu",
			"  [B] goes Back one level",
			"  [G] disconnects from the BBS",
			"",
			"Email:",
			"  Check your mailbox regularly.",
			"  Some messages may require a reply.",
			"",
			"Message Boards:",
			"  Read messages from other users.",
			"  New boards may appear as you",
			"  gain trust in the community.",
			"",
			"[Press any key for menu]",
			""
		];

		return { message: lines.join("\n"), waitForKey: true };
	},

	/**
	 * Disconnect from current BBS
	 */
	disconnect: function() {
		this.currentBBS = null;
		this.currentBoard = null;
		this.currentMessage = null;
		this.currentEmail = null;
		this.replyContext = null;
		this.sessionState = HackerMystery.BBSHandler.STATE_DISCONNECTED;

		return {
			message: "\nDisconnecting...\n\nNO CARRIER\n",
			disconnected: true
		};
	}
});
