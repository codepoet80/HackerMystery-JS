/**
 * HackerMystery.BBSData
 *
 * Data for all BBS systems in the game. Contains message boards,
 * email messages, and user information for each BBS.
 */
enyo.kind({
	name: "HackerMystery.BBSData",
	kind: enyo.Component,

	statics: {
		instance: null,
		getInstance: function() {
			if (!HackerMystery.BBSData.instance) {
				HackerMystery.BBSData.instance = new HackerMystery.BBSData();
			}
			return HackerMystery.BBSData.instance;
		}
	},

	// All BBS systems indexed by phone number
	systems: null,

	create: function() {
		this.inherited(arguments);
		this.initSystems();
	},

	initSystems: function() {
		this.systems = {
			"555-0199": this.createUnderground(),
			"555-0134": this.createCyberDen(),
			"555-2176": this.createPhreakHole(),
			"555-0200": this.createGibsonFiles()
		};
	},

	/**
	 * Get a BBS by phone number
	 */
	getBBS: function(phoneNumber) {
		return this.systems[phoneNumber] || null;
	},

	/**
	 * The Underground - main story BBS
	 */
	createUnderground: function() {
		return {
			id: "underground",
			name: "The Underground",
			phoneNumber: "555-0199",
			password: "hackers",
			sysop: "Ginsberg",
			active: true,
			welcomeArt: [
				"The",
				" _     _      ____  _____ ____       ",
				"\/ \\ \/\\\/ \\  \/|\/  _ \\\/  __\/\/  __\\      ",
				"| | ||| |\\ ||| | \\||  \\  |  \\\/|      ",
				"| \\_\/|| | \\||| |_\/||  \/_ |    \/      ",
				"\\____\/\\_\/  \\|\\____\/\\____\\\\_\/\\_\\      ",
				" _____ ____  ____  _     _      ____  ",
				"\/  __\/\/  __\\\/  _ \\\/ \\ \/\\\/ \\  \/|\/  _ \\ ",
				"| |  _|  \\\/|| \/ \\|| | ||| |\\ ||| | \\| ",
				"| |_\/\/|    \/| \\_\/|| \\_\/|| | \\||| |_\/| ",
				"\\____\\\\_\/\\_\\\\____\/\\____\/\\_\/  \\|\\____\/ ",
				"",
				"            \"Boot up or shut up!\"",
				"            Sysop: Ginsberg",
				""
			],
			boards: {
				"general": {
					name: "General Discussion",
					messages: [
						{
							id: 1,
							from: "CrashOverride",
							date: "03/14/95",
							subject: "New here",
							body: [
								"Just found this place. Heard there are some",
								"serious hackers here. Looking to learn.",
								"",
								"Anyone got tips for a newbie?"
							]
						},
						{
							id: 2,
							from: "Acid Burn",
							date: "03/14/95",
							subject: "RE: New here",
							body: [
								"Tips? Yeah. Don't get caught.",
								"",
								"Mess with the best, die like the rest.",
								"",
								"Prove yourself and maybe we'll talk."
							],
							canReply: true,
							replyPrompt: "Post your reply to Acid Burn:",
							replyResponse: {
								setsFlags: ["replied_to_acid_burn"],
								// Post user's reply and Acid Burn's response to the board
								addUserPost: true,
								queueBoardReply: {
									from: "Acid Burn",
									subject: "RE: RE: New here",
									body: [
										"Interesting. You've got guts posting",
										"on my board.",
										"",
										"I've been watching you poke around.",
										"Word is you've found some interesting",
										"files. Care to share what you know?",
										"",
										"Check your email. I've sent you",
										"something more... private.",
										"",
										"- AB"
									],
									// When this board message is read, queue a private email
									onRead: {
										queueEmail: {
											from: "Acid Burn",
											subject: "Private message",
											body: [
												"This is between you and me.",
												"",
												"I don't know who you are, but you've",
												"been digging in some dangerous places.",
												"",
												"Tell me what you found. What's the big",
												"secret they're hiding? What project?",
												"",
												"Prove you're not a fed and maybe we",
												"can help each other.",
												"",
												"- AB"
											],
											replies: [
												{
													trigger: "gibson",
													response: {
														from: "Acid Burn",
														subject: "RE: Private message",
														body: [
															"GIBSON. So you found it.",
															"",
															"That's the supercomputer at Ellingson",
															"Mineral. But here's the thing - someone",
															"put a backdoor in it. A worm.",
															"",
															"We need proof. Hard evidence.",
															"",
															"I've unlocked the Elite board for you.",
															"Check it out - I've posted what we",
															"know so far.",
															"",
															"But we need someone on the inside.",
															"Someone who can get us the files.",
															"",
															"You up for a challenge?",
															"",
															"Hack the planet.",
															"",
															"- Acid Burn"
														],
														setsFlags: ["acid_burn_trusts_player", "contacted_acid_burn"]
													}
												}
											]
										}
									}
								}
							}
						},
						{
							id: 3,
							from: "PhantomPhreak",
							date: "03/13/95",
							subject: "Phone company backdoor",
							body: [
								"Found a new way into the telco switch.",
								"Won't post details here - too many eyes.",
								"",
								"If you know, you know."
							]
						}
					]
				},
				"elite": {
					name: "Elite Section",
					requiresFlag: "acid_burn_trusts_player",
					messages: [
						{
							id: 1,
							from: "Acid Burn",
							date: "03/15/95",
							subject: "GIBSON - What we know",
							body: [
								"Alright, you've earned access.",
								"",
								"Here's what we know about GIBSON:",
								"- It's a supercomputer at Ellingson Mineral",
								"- Someone installed a backdoor",
								"- They're using it for something big",
								"",
								"We need proof before we can act.",
								"I've got a contact on the inside.",
								"",
								"The story will continue soon..."
							]
						}
					]
				}
			},
			email: {
				// Email messages keyed by game state
				// Private emails are now triggered by reading board messages (see queueBoardReply.onRead)
				"default": []
			}
		};
	},

	/**
	 * CyberDen - banned BBS
	 */
	createCyberDen: function() {
		return {
			id: "cyberden",
			name: "CyberDen BBS",
			phoneNumber: "555-0134",
			password: null,  // No password needed
			sysop: "Unknown",
			active: true,
			banned: true,
			banMessage: [
				"",
				"================================",
				"      ACCESS DENIED",
				"================================",
				"",
				"Your handle has been banned.",
				"Reason: Suspicious activity",
				"",
				"Contact sysop if you believe",
				"this is an error.",
				"",
				"(It's not an error.)",
				""
			]
		};
	},

	/**
	 * PhreakHole - dead BBS
	 */
	createPhreakHole: function() {
		return {
			id: "phreakhole",
			name: "PhreakHole",
			phoneNumber: "555-2176",
			active: false,
			deadMessage: [
				"",
				"NO CARRIER",
				"",
				"The number you have dialed",
				"is no longer in service.",
				""
			]
		};
	},

	/**
	 * Gibson Files - secret endgame BBS
	 */
	createGibsonFiles: function() {
		return {
			id: "gibsonfiles",
			name: "The Gibson Files",
			phoneNumber: "555-0200",
			password: null,
			sysop: "???",
			active: false,
			requiresFlag: "knows_gibson_number",
			lockedMessage: [
				"",
				"CONNECTING...",
				"...",
				"...",
				"NO CARRIER",
				"",
				"[Connection refused]",
				""
			]
		};
	},

	/**
	 * Get email for a user based on game state
	 */
	getEmailForBBS: function(bbsId) {
		var gameState = HackerMystery.GameState.getInstance();
		var bbs = null;

		// Find BBS by ID
		for (var phone in this.systems) {
			if (this.systems[phone].id === bbsId) {
				bbs = this.systems[phone];
				break;
			}
		}

		if (!bbs || !bbs.email) {
			return [];
		}

		var emails = [];

		// Add emails based on flags
		for (var flagName in bbs.email) {
			if (flagName === "default" || gameState.getFlag(flagName)) {
				var flagEmails = bbs.email[flagName];
				for (var i = 0; i < flagEmails.length; i++) {
					emails.push(flagEmails[i]);
				}
			}
		}

		return emails;
	}
});
