/**
 * HackerMystery.FileSystem
 *
 * Virtual filesystem for the game. Contains all files and folders
 * the player can explore. Files can be locked until certain flags are set.
 */
enyo.kind({
	name: "HackerMystery.FileSystem",
	kind: enyo.Component,

	statics: {
		instance: null,
		getInstance: function() {
			if (!HackerMystery.FileSystem.instance) {
				HackerMystery.FileSystem.instance = new HackerMystery.FileSystem();
			}
			return HackerMystery.FileSystem.instance;
		},

		// File types
		TYPE_FOLDER: "folder",
		TYPE_TEXT: "text",
		TYPE_IMAGE: "image",
		TYPE_ENCRYPTED: "encrypted"
	},

	// The filesystem tree
	root: null,

	// Current working directory (array of path segments)
	cwd: null,

	create: function() {
		this.inherited(arguments);
		this.cwd = ["home"];
		this.initFileSystem();
	},

	/**
	 * Initialize the filesystem with Chapter 1 content
	 */
	initFileSystem: function() {
		this.root = {
			"home": {
				type: "folder",
				name: "home",
				children: {
					"readme.txt": {
						type: "text",
						name: "readme.txt",
						created: "1995-03-15",
						content: this.getReadmeContent()
					},
					"documents": {
						type: "folder",
						name: "documents",
						children: {
							"manifesto.txt": {
								type: "text",
								name: "manifesto.txt",
								created: "1995-02-28",
								content: this.getManifestoContent()
							},
							"notes.txt": {
								type: "text",
								name: "notes.txt",
								created: "1995-03-10",
								content: this.getNotesContent()
							},
							"contacts.txt": {
								type: "text",
								name: "contacts.txt",
								created: "1995-03-12",
								locked: true,
								unlockFlag: "found_contacts_hint",
								content: this.getContactsContent(),
								onReadFlag: "knows_gibson_number"
							}
						}
					},
					"logs": {
						type: "folder",
						name: "logs",
						children: {
							"system.log": {
								type: "text",
								name: "system.log",
								created: "1995-03-14",
								content: this.getSystemLogContent()
							},
							"connection.log": {
								type: "text",
								name: "connection.log",
								created: "1995-03-13",
								content: this.getConnectionLogContent()
							}
						}
					},
					"secrets": {
						type: "folder",
						name: "secrets",
						hidden: true,
						unlockFlag: "discovered_secrets_folder",
						children: {
							"too_many_secrets.enc": {
								type: "encrypted",
								name: "too_many_secrets.enc",
								created: "1995-03-01",
								content: this.getEncryptedContent(),
								password: "hackers",
								decryptedContent: this.getDecryptedSecretsContent()
							},
							"bbs_list.txt": {
								type: "text",
								name: "bbs_list.txt",
								created: "1995-02-20",
								content: this.getBBSListContent()
							}
						}
					},
					"trash": {
						type: "folder",
						name: "trash",
						hidden: true,
						children: {
							"deleted_email.txt": {
								type: "text",
								name: "deleted_email.txt",
								created: "1995-03-08",
								content: this.getDeletedEmailContent()
							},
							"fragment.txt": {
								type: "text",
								name: "fragment.txt",
								created: "1995-03-05",
								content: this.getFragmentContent()
							}
						}
					}
				}
			}
		};
	},

	// ============================================
	// Chapter 1 File Contents
	// ============================================

	getReadmeContent: function() {
		return [
			"========================================",
			"  WELCOME TO THE SYSTEM",
			"========================================",
			"",
			"You thought your secrets were safe.",
			"You were wrong.",
			"",
			"This machine belonged to someone who",
			"knew too much. They're gone now, but",
			"they left breadcrumbs for anyone",
			"curious enough to follow them.",
			"",
			"Start with the documents folder.",
			"Trust nothing. Question everything.",
			"",
			"My only crime is that of curiosity.",
			"",
			"- X",
			""
		].join("\n");
	},

	getManifestoContent: function() {
		return [
			"THE HACKER'S MANIFESTO",
			"----------------------",
			"",
			"We are hackers.",
			"We hack.",
			"We explore.",
			"We seek knowledge.",
			"We are not criminals - we are pioneers.",
			"",
			"My crime is that of curiosity.",
			"My crime is that of judging people by",
			"what they say and think, not what they",
			"look like.",
			"",
			"Remember: hacking is more than just",
			"a crime. It's a survival trait.",
			"",
			"The systems they build to control us",
			"can be turned against them. Every",
			"backdoor they create for surveillance",
			"is a door we can walk through.",
			"",
			"There is no right or wrong.",
			"Only fun and boring.",
			"",
			"HACK THE PLANET.",
			""
		].join("\n");
	},

	getNotesContent: function() {
		return [
			"PERSONAL NOTES - MARCH 1995",
			"---------------------------",
			"",
			"3/12 - Found something big. Corp records",
			"      that don't add up. Need to dig more.",
			"",
			"3/13 - They're covering something up.",
			"      The same secret project keeps coming up.",
			"      What are they hiding?",
			"",
			"3/14 - Made contact with someone on ",
			"      a BBS. Goes by Acid Burn.",
			"      Skeptical of me. Says I need to",
			"      prove myself. 'Mess with the best,",
			"      die like the rest' - their words.",
			"",
			"3/15 - Too dangerous to keep digging alone.",
			"       If you're reading this, find the",
			"       BBS. Find Acid Burn. The password",
			"       to connect is hidden in plain sight.",
			"",
			"       Check the View menu. Find the trash.",
			"       People forget what they throw away.",
			""
		].join("\n");
	},

	getContactsContent: function() {
		return [
			"CONTACTS - ENCRYPTED CHANNEL",
			"----------------------------",
			"",
			"Acid Burn     - \"I don't play well",
			"                 with others\"",
			"              - Trust must be earned",
			"",
			"Phantom Phreak - Hardware specialist",
			"               - Owes me a favor",
			"",
			"Cereal Killer  - Info broker",
			"               - Unreliable but connected",
			"",
			"Crash Override - Newbie hacker",
			"               - Plays well with others",
			"               - Just got a new job...",
			"               - modem: 555-0200",
			""
		].join("\n");
	},

	getSystemLogContent: function() {
		return [
			"SYSTEM LOG - MARCH 1995",
			"-----------------------",
			"",
			"03/14 02:14 - Login attempt from unknown",
			"03/14 02:15 - Login attempt from unknown",
			"03/15 02:15 - Login attempt from unknown",
			"03/15 02:16 - ALERT: Brute force detected",
			"03/15 02:20 - Connection terminated",
			"03/15 03:45 - Scheduled backup started",
			"03/15 03:47 - Backup complete",
			"03/15 08:00 - System startup",
			"03/15 08:01 - Hidden folder access: /secrets",
			"03/15 08:05 - File modified: too_many_secrets.enc",
			"03/15 08:30 - External connection: BBS dial-out",
			"03/15 08:35 - Connection closed",
			"",
			"[Earlier entries purged]",
			""
		].join("\n");
	},

	getConnectionLogContent: function() {
		return [
			"CONNECTION LOG",
			"--------------",
			"",
			"Last successful BBS connections:",
			"",
			"03/11 19:30 - 555-0134",
			"              Duration: 3 minutes",
			"              Messages: 1 received",
			"",
			"03/12 22:15 - 555-2176",
			"              Duration: 57 seconds",
			"",
			"03/14 21:00 - 555-0199",
			"              Duration: 47 minutes",
			"              Messages: 12 sent, 8 received",
			"",
			"03/15 19:30 - 555-0134",
			"              Duration: 15 minutes",
			"              Messages: 1 sent",
			"",
			"NOTE: The Underground requires password.",
			"      Hint is in the secrets folder.",
			""
		].join("\n");
	},

	getDeletedEmailContent: function() {
		return [
			"FROM: [REDACTED]@corp.net",
			"TO: [REDACTED]",
			"SUBJECT: RE: Project GIBSON",
			"DATE: March 10, 1995",
			"",
			"---",
			"",
			"This email should have been deleted.",
			"",
			"The GIBSON project is proceeding as",
			"planned. All evidence of the security",
			"flaw has been buried. No one will",
			"ever know about the backdoor.",
			"",
			"Destroy this message after reading.",
			"",
			"Remember: there are too many secrets",
			"at stake. The secrets folder on the",
			"old dev machine still needs to be",
			"wiped. Handle it personally.",
			"",
			"- M",
			""
		].join("\n");
	},

	getFragmentContent: function() {
		return [
			"[FILE FRAGMENT - PARTIALLY CORRUPTED]",
			"",
			"...password for the underground...",
			"...simple, hidden in plain sight...",
			"...name for people who hack...",
			"...the password is just that...",
			"...delete this note after...",
			"",
			"[END OF RECOVERABLE DATA]",
			""
		].join("\n");
	},

	getEncryptedContent: function() {
		return [
			"╔══════════════════════════════════╗",
			"║  ENCRYPTED FILE                  ║",
			"║  Algorithm: JN-CYPHER.           ║",
			"║                                  ║",
			"║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║",
			"║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║",
			"║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║",
			"║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║",
			"║                                  ║",
			"║  Enter password to decrypt...    ║",
			"╚══════════════════════════════════╝",
			""
		].join("\n");
	},

	getDecryptedSecretsContent: function() {
		return [
			"DECRYPTED - TOP SECRET",
			"----------------------",
			"",
			"If you're reading this, you found",
			"the password. Good.",
			"",
			"PROJECT GIBSON is real. It's a",
			"supercomputer at Ellingson Mineral.",
			"But that's not the secret.",
			"",
			"The secret is what it's connected to.",
			"Every bank. Every power grid. Every",
			"military system. One backdoor to",
			"rule them all.",
			"",
			"They're going to use it. Soon.",
			"",
			"Find Acid Burn on The Underground BBS.",
			"They'll know what to do.",
			"",
			"Trust your technolust.",
			"",
			"- The Ghost in the Machine",
			""
		].join("\n");
	},

	getBBSListContent: function() {
		return [
			"BBS DIRECTORY - MARCH 1995",
			"--------------------------",
			"",
			"The Underground   [ACTIVE]",
			"  - Password required",
			"",
			"CyberDen          [BANNED]",
			"  - Too many narcs",
			"",
			"PhreakHole        [DEAD]",
			"  - Shut down by feds 03/01",
			"",
			"The Gibson Files  [UNKNOWN]",
			"  - Rumored to exist",
			"  - No confirmed access",
			"",
			"To connect: Use Terminal",
			"   command dial, then number",
			""
		].join("\n");
	},

	// ============================================
	// Filesystem Navigation Methods
	// ============================================

	/**
	 * Get node at path
	 * @param {string|array} path - Path string or array of segments
	 */
	getNode: function(path) {
		var segments = this._parsePath(path);
		var node = this.root;

		for (var i = 0; i < segments.length; i++) {
			var segment = segments[i];
			if (node && node.children && node.children[segment]) {
				node = node.children[segment];
			} else if (node && node[segment]) {
				node = node[segment];
			} else {
				return null;
			}
		}

		return node;
	},

	/**
	 * List contents of a folder
	 * @param {string} path - Path to folder
	 * @param {boolean} showHidden - Include hidden files
	 */
	listFolder: function(path, showHidden) {
		var node = this.getNode(path);
		if (!node || node.type !== "folder") {
			return null;
		}

		var gameState = HackerMystery.GameState.getInstance();
		var items = [];

		for (var name in node.children) {
			if (node.children.hasOwnProperty(name)) {
				var child = node.children[name];

				// Check if hidden
				if (child.hidden && !showHidden) {
					// Check if unlocked by flag
					if (!child.unlockFlag || !gameState.getFlag(child.unlockFlag)) {
						continue;
					}
				}

				items.push({
					name: child.name,
					type: child.type,
					locked: this._isLocked(child),
					hidden: child.hidden || false,
					created: child.created || ""
				});
			}
		}

		// Sort: folders first, then alphabetically
		items.sort(function(a, b) {
			if (a.type === "folder" && b.type !== "folder") return -1;
			if (a.type !== "folder" && b.type === "folder") return 1;
			return a.name.localeCompare(b.name);
		});

		return items;
	},

	/**
	 * Read file content
	 * @param {string} path - Path to file
	 */
	readFile: function(path) {
		var node = this.getNode(path);
		if (!node || node.type === "folder") {
			return null;
		}

		if (this._isLocked(node)) {
			return { locked: true, content: null };
		}

		return {
			locked: false,
			type: node.type,
			content: node.content,
			name: node.name,
			encrypted: node.type === "encrypted",
			password: node.password || null,
			decryptedContent: node.decryptedContent || null,
			onReadFlag: node.onReadFlag || null
		};
	},

	/**
	 * Get current working directory as path string
	 */
	getCwd: function() {
		return "/" + this.cwd.join("/");
	},

	/**
	 * Set current working directory
	 */
	setCwd: function(path) {
		var segments = this._parsePath(path);
		var node = this.getNode(segments);

		if (node && node.type === "folder") {
			this.cwd = segments;
			return true;
		}
		return false;
	},

	/**
	 * Check if node is locked
	 */
	_isLocked: function(node) {
		if (!node.locked) return false;
		if (!node.unlockFlag) return true;

		var gameState = HackerMystery.GameState.getInstance();
		return !gameState.getFlag(node.unlockFlag);
	},

	/**
	 * Parse path string into segments
	 */
	_parsePath: function(path) {
		if (Array.isArray(path)) {
			return path;
		}

		// Handle absolute vs relative paths
		var segments;
		if (path.charAt(0) === "/") {
			segments = path.substring(1).split("/");
		} else {
			segments = this.cwd.concat(path.split("/"));
		}

		// Filter empty segments and handle . and ..
		var result = [];
		for (var i = 0; i < segments.length; i++) {
			var seg = segments[i];
			if (seg === "" || seg === ".") {
				continue;
			} else if (seg === "..") {
				if (result.length > 0) {
					result.pop();
				}
			} else {
				result.push(seg);
			}
		}

		return result;
	},

	/**
	 * Unlock a hidden folder/file by setting its flag
	 */
	discoverSecret: function(flagName) {
		var gameState = HackerMystery.GameState.getInstance();
		gameState.setFlag(flagName, true);
	}
});
