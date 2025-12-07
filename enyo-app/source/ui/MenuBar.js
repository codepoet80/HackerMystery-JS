/**
 * HackerMystery.MenuBar
 *
 * Mac-style menu bar that sits at the top of the screen.
 * Provides File menu (Save/Load) and context-sensitive View menu.
 */
enyo.kind({
	name: "HackerMystery.MenuBar",
	kind: enyo.Control,
	className: "hm-menubar",

	// Track which menu is currently open
	openMenu: null,

	// Track the currently focused window type for context menus
	focusedWindowType: null,

	events: {
		onMenuAction: ""
	},

	components: [
		// App menu (About)
		{name: "appMenu", kind: enyo.Control, className: "hm-menubar-menu",
			components: [
				{name: "appMenuTitle", kind: enyo.Control, className: "hm-menubar-appname",
					content: "Hacker Mystery 95", menuName: "app"
				},
				{name: "appMenuDropdown", kind: enyo.Control, className: "hm-menubar-dropdown",
					showing: false,
					components: [
						{name: "aboutItem", kind: enyo.Control, className: "hm-menubar-item",
							content: "About", action: "about"
						}
					]
				}
			]
		},
		// File menu
		{name: "fileMenu", kind: enyo.Control, className: "hm-menubar-menu",
			components: [
				{name: "fileMenuTitle", kind: enyo.Control, className: "hm-menubar-menu-title",
					content: "File", menuName: "file"
				},
				{name: "fileMenuDropdown", kind: enyo.Control, className: "hm-menubar-dropdown",
					showing: false,
					components: [
						{name: "saveItem", kind: enyo.Control, className: "hm-menubar-item",
							content: "Save Game", action: "save"
						},
						{name: "loadItem", kind: enyo.Control, className: "hm-menubar-item",
							content: "Load Game", action: "load"
						}
					]
				}
			]
		},
		// View menu (context-sensitive)
		{name: "viewMenu", kind: enyo.Control, className: "hm-menubar-menu",
			showing: false,
			components: [
				{name: "viewMenuTitle", kind: enyo.Control, className: "hm-menubar-menu-title",
					content: "View", menuName: "view"
				},
				{name: "viewMenuDropdown", kind: enyo.Control, className: "hm-menubar-dropdown",
					showing: false,
					components: [
						{name: "showHiddenItem", kind: enyo.Control, className: "hm-menubar-item",
							content: "Show Hidden Files", action: "toggleHidden"
						}
					]
				}
			]
		},
		// Score counter (right side)
		{name: "scoreMenu", kind: enyo.Control, className: "hm-menubar-score-menu",
			components: [
				{name: "scoreDisplay", kind: enyo.Control, className: "hm-menubar-score",
					content: "0", menuName: "score"
				},
				{name: "scoreDropdown", kind: enyo.Control, className: "hm-menubar-dropdown hm-menubar-dropdown-right",
					showing: false,
					components: [
						{name: "scoreLabel", kind: enyo.Control, className: "hm-menubar-item hm-menubar-item-disabled",
							content: "Hacked 0 of 0 puzzles"
						}
					]
				}
			]
		},
		// Invisible overlay to catch clicks outside menus
		{name: "menuOverlay", kind: enyo.Control, className: "hm-menubar-overlay",
			showing: false
		}
	],

	rendered: function() {
		this.inherited(arguments);
		var self = this;

		// Helper to bind click handler to a node (compatible with old WebKit)
		var bindClick = function(node, handler) {
			if (!node) return;
			node.onclick = function(e) {
				e = e || window.event;
				handler(e);
				// Old browser compatibility
				if (e.preventDefault) {
					e.preventDefault();
				} else {
					e.returnValue = false;
				}
				if (e.stopPropagation) {
					e.stopPropagation();
				} else {
					e.cancelBubble = true;
				}
				return false;
			};
		};

		// Bind menu title clicks
		bindClick(this.$.appMenuTitle.hasNode(), function() {
			self.toggleMenuByName("app");
		});
		bindClick(this.$.fileMenuTitle.hasNode(), function() {
			self.toggleMenuByName("file");
		});
		bindClick(this.$.viewMenuTitle.hasNode(), function() {
			self.toggleMenuByName("view");
		});
		bindClick(this.$.scoreDisplay.hasNode(), function() {
			self.toggleMenuByName("score");
		});

		// Bind menu item clicks
		bindClick(this.$.aboutItem.hasNode(), function() {
			self.handleMenuAction("about");
		});
		bindClick(this.$.saveItem.hasNode(), function() {
			self.handleMenuAction("save");
		});
		bindClick(this.$.loadItem.hasNode(), function() {
			self.handleMenuAction("load");
		});
		bindClick(this.$.showHiddenItem.hasNode(), function() {
			self.handleMenuAction("toggleHidden");
		});

		// Overlay closes menu
		bindClick(this.$.menuOverlay.hasNode(), function() {
			self.closeAllMenus();
		});
	},

	/**
	 * Handle a menu action
	 */
	handleMenuAction: function(action) {
		this.closeAllMenus();
		this.doMenuAction({action: action});
	},

	/**
	 * Set the focused window type to show/hide context menus
	 */
	setFocusedWindowType: function(windowType) {
		this.focusedWindowType = windowType;
		// Show View menu only for FileViewer
		this.$.viewMenu.setShowing(windowType === "HackerMystery.FileViewer");
	},

	/**
	 * Update the "Show Hidden Files" menu item text based on current state
	 */
	setShowHiddenState: function(isShowing) {
		if (isShowing) {
			this.$.showHiddenItem.setContent("√ Show Hidden Files");
		} else {
			this.$.showHiddenItem.setContent("  Show Hidden Files");
		}
	},

	/**
	 * Toggle a menu open/closed by name
	 */
	toggleMenuByName: function(menuName) {
		var dropdown;

		if (menuName === "app") {
			dropdown = this.$.appMenuDropdown;
		} else if (menuName === "file") {
			dropdown = this.$.fileMenuDropdown;
		} else if (menuName === "view") {
			dropdown = this.$.viewMenuDropdown;
		} else if (menuName === "score") {
			dropdown = this.$.scoreDropdown;
		}

		if (!dropdown) return;

		var isOpen = dropdown.getShowing();

		// Close all menus first
		this.closeAllMenus();

		// If it wasn't open, open it now
		if (!isOpen) {
			dropdown.setShowing(true);
			this.$.menuOverlay.setShowing(true);
			this.openMenu = menuName;
		}
	},

	/**
	 * Toggle a menu open/closed (legacy, for onclick handlers)
	 */
	toggleMenu: function(inSender, inEvent) {
		this.toggleMenuByName(inSender.menuName);
		return true;
	},

	/**
	 * Close all open menus
	 */
	closeAllMenus: function() {
		this.$.appMenuDropdown.setShowing(false);
		this.$.fileMenuDropdown.setShowing(false);
		this.$.viewMenuDropdown.setShowing(false);
		this.$.scoreDropdown.setShowing(false);
		this.$.menuOverlay.setShowing(false);
		this.openMenu = null;
		return true;
	},

	/**
	 * Update the score display
	 * @param {number} completed - Number of puzzles completed
	 * @param {number} total - Total number of puzzles
	 */
	updateScore: function(completed, total) {
		this.$.scoreDisplay.setContent(completed.toString());
		this.$.scoreLabel.setContent("Hacked " + completed + " of " + total + " puzzles");
	}
});
