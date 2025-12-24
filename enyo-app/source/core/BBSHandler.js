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
		STATE_COMPOSING_BOARD: "composing_board",
		STATE_STATIC_MESSAGE: "static_message",
		STATE_PRESS_ANY_KEY: "press_any_key",
		STATE_GUESTBOOK: "guestbook",
		STATE_SIGNING_GUESTBOOK_NAME: "signing_guestbook_name",
		STATE_SIGNING_GUESTBOOK: "signing_guestbook"
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

	// Flag to show new board message notification
	hasNewBoardMessage: false,

	// Bad words list for profanity filter
	badWords: null,
	badWordsLoaded: false,

	// Guestbook URLs (default to http, upgraded to https if client is on https)
	guestbookUrl: "http://hackermystery95.wosa.link/app/server/data/guestbook.csv",
	guestbookPostUrl: "http://hackermystery95.wosa.link/app/server/guestbook.php",
	badWordsUrl: "https://raw.githubusercontent.com/dsojevic/profanity-list/refs/heads/main/en.txt",

	// Flag for offline guestbook mode (no signing available)
	guestbookOffline: false,

	// Pending guestbook sign data
	pendingGuestbookName: null,

	create: function() {
		this.inherited(arguments);
		this.sessionState = HackerMystery.BBSHandler.STATE_DISCONNECTED;
		this.pendingEmails = [];
		this.pendingBoardReplies = [];
		this.badWords = [];

		// Upgrade URLs to https if client is already on https
		this.upgradeUrlsIfSecure();

		this.loadBadWords();
	},

	/**
	 * Upgrade remote URLs to https if the app is served over https
	 */
	upgradeUrlsIfSecure: function() {
		if (window.location.protocol === "https:") {
			this.guestbookUrl = this.guestbookUrl.replace("http://", "https://");
			this.guestbookPostUrl = this.guestbookPostUrl.replace("http://", "https://");
		}
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

		// Check if BBS requires a flag to access
		var gameState = HackerMystery.GameState.getInstance();
		if (bbs.requiresFlag && !gameState.getFlag(bbs.requiresFlag)) {
			return {
				success: false,
				message: bbs.lockedMessage ? bbs.lockedMessage.join("\n") : "NO CARRIER"
			};
		}

		// Check if BBS is active (requiresFlag can override inactive status)
		if (!bbs.active && !bbs.requiresFlag) {
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

		// Start connection
		this.currentBBS = bbs;

		// Check if BBS has a static message (e.g., chapter ending)
		if (bbs.staticMessage) {
			this.sessionState = HackerMystery.BBSHandler.STATE_STATIC_MESSAGE;
			return {
				success: true,
				message: bbs.staticMessage.join("\n"),
				waitForKey: true
			};
		}

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

		// Show new board message indicator
		if (this.hasNewBoardMessage) {
			menu.push("  [B] Message Boards  (New Reply!)");
		} else {
			menu.push("  [B] Message Boards");
		}

		// Show new mail indicator
		if (this.hasNewMail) {
			menu.push("  [E] Email  *** NEW MAIL ***");
		} else {
			menu.push("  [E] Email");
		}

		menu.push("  [S] See Guestbook");
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

			case HackerMystery.BBSHandler.STATE_STATIC_MESSAGE:
				// Any input disconnects
				return this.disconnect();

			case HackerMystery.BBSHandler.STATE_PRESS_ANY_KEY:
				// Any input returns to main menu
				return this.returnToMainMenu();

			case HackerMystery.BBSHandler.STATE_GUESTBOOK:
				return this.handleGuestbook(input);

			case HackerMystery.BBSHandler.STATE_SIGNING_GUESTBOOK_NAME:
				return this.handleSigningGuestbookName(input);

			case HackerMystery.BBSHandler.STATE_SIGNING_GUESTBOOK:
				return this.handleSigningGuestbook(input);

			default:
				return { message: "ERROR: Unknown state" };
		}
	},

	/**
	 * Handle password entry
	 */
	handlePassword: function(input) {
		var enteredPassword = input.toLowerCase();
		var correctPassword = this.currentBBS.password.toLowerCase();

		// Accept both singular and plural forms (e.g., "hacker" and "hackers")
		var passwordMatch = (enteredPassword === correctPassword) ||
			(correctPassword === "hackers" && enteredPassword === "hacker");

		if (passwordMatch) {
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

			case "S":
				return this.showGuestbook();

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
			this.hasNewBoardMessage = true;
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

		// Clear new board message indicator
		this.hasNewBoardMessage = false;

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

		// Handle onRead trigger (queue email or set flags when message is read)
		if (msg.onRead && !msg.onReadTriggered) {
			msg.onReadTriggered = true;

			// Set flags if specified
			if (msg.onRead.setsFlags) {
				var gameState = HackerMystery.GameState.getInstance();
				for (var i = 0; i < msg.onRead.setsFlags.length; i++) {
					gameState.setFlag(msg.onRead.setsFlags[i], true);
				}
			}

			// Queue email if specified
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

		// Return with confirmation - use STATE_READING_MESSAGE so B goes to message list
		this.sessionState = HackerMystery.BBSHandler.STATE_READING_MESSAGE;

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

		if (input.toUpperCase() === "B") {
			// Redisplay email list
			return this.showEmail();
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

		// Handle onRead trigger (set flags when email is read)
		if (email.onRead && !email.onReadTriggered) {
			email.onReadTriggered = true;

			if (email.onRead.setsFlags) {
				var gameState = HackerMystery.GameState.getInstance();
				for (var i = 0; i < email.onRead.setsFlags.length; i++) {
					gameState.setFlag(email.onRead.setsFlags[i], true);
				}
			}
		}

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
			// Apply flags from sending the reply (GameState.setFlag automatically notifies PuzzleEngine)
			if (matchedReply.setsFlags) {
				var gameState = HackerMystery.GameState.getInstance();

				for (var j = 0; j < matchedReply.setsFlags.length; j++) {
					var flag = matchedReply.setsFlags[j];
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
				replies: [],  // No further replies on response emails
				onRead: matchedReply.response.onRead || null  // Preserve onRead trigger
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
		this.sessionState = HackerMystery.BBSHandler.STATE_PRESS_ANY_KEY;

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
		this.sessionState = HackerMystery.BBSHandler.STATE_PRESS_ANY_KEY;

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
	},

	/**
	 * Load bad words list for profanity filter
	 */
	loadBadWords: function() {
		var self = this;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", this.badWordsUrl, true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					var lines = xhr.responseText.split("\n");
					self.badWords = [];
					for (var i = 0; i < lines.length; i++) {
						var word = lines[i].trim().toLowerCase();
						if (word) {
							self.badWords.push(word);
						}
					}
					self.badWordsLoaded = true;
				}
			}
		};
		try {
			xhr.send();
		} catch (e) {
			// Silently fail - profanity filter won't work but guestbook still will
		}
	},

	/**
	 * Check if text contains profanity (whole word matching)
	 * @param {string} text - Text to check
	 * @returns {boolean} - True if profanity found
	 */
	containsProfanity: function(text) {
		if (!this.badWordsLoaded || !this.badWords.length) {
			return false;
		}

		var lowerText = text.toLowerCase();

		for (var i = 0; i < this.badWords.length; i++) {
			var word = this.badWords[i];
			// Use word boundary matching to avoid false positives like "hello" containing "hell"
			// Create a regex with word boundaries: \b matches word boundary
			try {
				var regex = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
				if (regex.test(lowerText)) {
					return true;
				}
			} catch (e) {
				// Fallback to simple indexOf for invalid regex patterns
				if (lowerText.indexOf(word) !== -1) {
					return true;
				}
			}
		}

		return false;
	},

	/**
	 * Show guestbook - fetches data asynchronously
	 */
	showGuestbook: function() {
		var self = this;
		this.sessionState = HackerMystery.BBSHandler.STATE_GUESTBOOK;

		// Show loading message
		if (this.terminal) {
			this.terminal.println("\nLoading guestbook...\n");
		}

		// Try remote URL first, fallback to hardcoded offline message
		this.fetchGuestbook(this.guestbookUrl + "?t=" + Date.now(), function(success, data) {
			if (success) {
				self.guestbookOffline = false;
				self.displayGuestbook(data);
			} else {
				// Fallback to hardcoded offline guestbook
				self.guestbookOffline = true;  // No signing in offline mode
				self.displayGuestbook("2025-12-24 19:59:47,codepoet,Thanks for playing!");
			}
		});

		// Return empty - output is async
		return { message: "" };
	},

	/**
	 * Fetch guestbook data from URL
	 */
	fetchGuestbook: function(url, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 && xhr.responseText) {
					callback(true, xhr.responseText);
				} else {
					callback(false, null);
				}
			}
		};
		xhr.onerror = function() {
			callback(false, null);
		};
		try {
			xhr.send();
		} catch (e) {
			callback(false, null);
		}
	},

	/**
	 * Display guestbook entries
	 */
	displayGuestbook: function(data) {
		var self = this;
		var lines = [
			"",
			"================================",
			"        GUESTBOOK",
			"================================",
			""
		];

		if (data) {
			var rows = data.split("\n");
			var entryCount = 0;

			for (var i = 0; i < rows.length; i++) {
				var row = rows[i].trim();
				if (!row) continue;

				// Parse CSV: date,username,message
				var parts = self.parseCSVLine(row);
				if (parts.length >= 3) {
					var dateStr = parts[0];
					var username = parts[1];
					var message = parts[2];

					// Format date
					var formattedDate = dateStr;
					try {
						var date = new Date(dateStr);
						if (!isNaN(date.getTime())) {
							formattedDate = date.toLocaleDateString();
						}
					} catch (e) {
						// Keep original date string
					}

					lines.push("  " + username + " (" + formattedDate + "):");
					lines.push("    \"" + message + "\"");
					lines.push("");
					entryCount++;
				}
			}

			if (entryCount === 0) {
				lines.push("  No entries yet.");
				lines.push("");
			}
		} else {
			lines.push("  Unable to load guestbook.");
			lines.push("  Please try again later.");
			lines.push("");
		}

		lines.push("--------------------------------");
		if (this.guestbookOffline) {
			lines.push("[M] Main Menu");
		} else {
			lines.push("[S] Sign Guestbook  [M] Main Menu");
		}
		lines.push("");

		if (this.terminal) {
			this.terminal.println(lines.join("\n"));
		}
	},

	/**
	 * Parse a CSV line handling quoted fields
	 */
	parseCSVLine: function(line) {
		var result = [];
		var current = "";
		var inQuotes = false;

		for (var i = 0; i < line.length; i++) {
			var char = line[i];

			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}

		result.push(current.trim());
		return result;
	},

	/**
	 * Handle guestbook menu choice
	 */
	handleGuestbook: function(input) {
		var choice = input.toUpperCase();

		if (choice === "M") {
			return this.returnToMainMenu();
		}

		if (choice === "S" && !this.guestbookOffline) {
			this.sessionState = HackerMystery.BBSHandler.STATE_SIGNING_GUESTBOOK_NAME;
			this.pendingGuestbookName = null;
			return {
				message: "\n" +
					"--------------------------------\n" +
					"     SIGN THE GUESTBOOK\n" +
					"--------------------------------\n" +
					"\n" +
					"Enter your name:\n" +
					"> "
			};
		}

		if (this.guestbookOffline) {
			return { message: "Invalid choice. [M] Menu: " };
		}
		return { message: "Invalid choice. [S] Sign  [M] Menu: " };
	},

	/**
	 * Handle guestbook name entry
	 */
	handleSigningGuestbookName: function(input) {
		if (!input || !input.trim()) {
			this.sessionState = HackerMystery.BBSHandler.STATE_GUESTBOOK;
			return { message: "No name entered.\n\n[S] Sign Guestbook  [M] Main Menu\n" };
		}

		// Strip commas from name for CSV safety
		var name = input.trim().replace(/,/g, "");

		// Limit name length
		if (name.length > 20) {
			name = name.substring(0, 20);
		}

		// Check for profanity in name
		if (this.containsProfanity(name)) {
			this.sessionState = HackerMystery.BBSHandler.STATE_GUESTBOOK;
			return {
				message: "\nSorry, that name contains inappropriate\n" +
					"language.\n\n" +
					"[S] Sign Guestbook  [M] Main Menu\n"
			};
		}

		// Store name and prompt for message
		this.pendingGuestbookName = name;
		this.sessionState = HackerMystery.BBSHandler.STATE_SIGNING_GUESTBOOK;

		return {
			message: "\nNow enter your message (keep it clean!):\n" +
				"> "
		};
	},

	/**
	 * Handle signing the guestbook
	 */
	handleSigningGuestbook: function(input) {
		var self = this;

		if (!input || !input.trim()) {
			this.sessionState = HackerMystery.BBSHandler.STATE_GUESTBOOK;
			return { message: "No message entered.\n\n[S] Sign Guestbook  [M] Main Menu\n" };
		}

		// Check for profanity
		if (this.containsProfanity(input)) {
			this.sessionState = HackerMystery.BBSHandler.STATE_GUESTBOOK;
			return {
				message: "\nSorry, your message contains inappropriate\n" +
					"language and cannot be posted.\n\n" +
					"[S] Sign Guestbook  [M] Main Menu\n"
			};
		}

		// Strip commas and limit message length for CSV safety
		var message = input.trim().replace(/,/g, "");
		if (message.length > 200) {
			message = message.substring(0, 200);
		}

		// Use the name collected in the previous step
		var username = this.pendingGuestbookName || "guest";

		// Show posting message
		if (this.terminal) {
			this.terminal.println("\nPosting to guestbook...");
		}

		// POST to server
		var xhr = new XMLHttpRequest();
		xhr.open("POST", this.guestbookPostUrl, true);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					if (self.terminal) {
						self.terminal.println("\nThanks for signing the guestbook!\n\n[M] Main Menu\n");
					}
				} else {
					if (self.terminal) {
						self.terminal.println("\nError posting message. Try again later.\n\n[M] Main Menu\n");
					}
				}
				self.pendingGuestbookName = null;
				self.sessionState = HackerMystery.BBSHandler.STATE_GUESTBOOK;
			}
		};

		try {
			var postData = "username=" + encodeURIComponent(username) +
				"&message=" + encodeURIComponent(message);
			xhr.send(postData);
		} catch (e) {
			this.pendingGuestbookName = null;
			this.sessionState = HackerMystery.BBSHandler.STATE_GUESTBOOK;
			return { message: "Error posting message.\n\n[M] Main Menu\n" };
		}

		// Return empty - output is async
		return { message: "" };
	}
});
