/**
 * HackerMystery.Desktop
 *
 * The main desktop surface with program icons.
 * Handles icon layout and program launch events.
 */
enyo.kind({
	name: "HackerMystery.Desktop",
	kind: enyo.Control,
	className: "hm-desktop",

	events: {
		onLaunchProgram: ""
	},

	// Icon configuration
	icons: [
		{id: "terminal", name: "Terminal", icon: "terminal.png"}
		// Future icons will be added here
	],

	// Track last tap for double-tap detection
	lastTapTime: 0,
	lastTapTarget: null,
	doubleTapDelay: 400,  // ms

	components: [
		{name: "iconContainer", kind: enyo.Control, className: "hm-desktop-icons"}
	],

	create: function() {
		this.inherited(arguments);
		this.createIcons();
	},

	/**
	 * Create desktop icons from configuration
	 */
	createIcons: function() {
		var container = this.$.iconContainer;

		for (var i = 0; i < this.icons.length; i++) {
			var iconConfig = this.icons[i];

			container.createComponent({
				kind: "HackerMystery.DesktopIcon",
				iconId: iconConfig.id,
				iconName: iconConfig.name,
				iconSrc: "images/icons/" + iconConfig.icon,
				onIconTap: "handleIconTap",
				owner: this
			});
		}
	},

	/**
	 * Handle icon tap - implement double-tap to launch
	 */
	handleIconTap: function(inSender, inEvent) {
		var now = Date.now();
		var iconId = inEvent.iconId;

		// Check for double-tap
		if (this.lastTapTarget === iconId &&
			(now - this.lastTapTime) < this.doubleTapDelay) {
			// Double-tap detected - launch program
			this.doLaunchProgram({program: iconId});
			this.lastTapTime = 0;
			this.lastTapTarget = null;
		} else {
			// First tap - record for potential double-tap
			this.lastTapTime = now;
			this.lastTapTarget = iconId;
		}

		return true;
	}
});

/**
 * HackerMystery.DesktopIcon
 *
 * Individual desktop icon component
 */
enyo.kind({
	name: "HackerMystery.DesktopIcon",
	kind: enyo.Control,
	className: "hm-desktop-icon",

	published: {
		iconId: "",
		iconName: "Icon",
		iconSrc: ""
	},

	events: {
		onIconTap: ""
	},

	components: [
		{name: "image", kind: enyo.Control, className: "hm-desktop-icon-image"},
		{name: "label", kind: enyo.Control, className: "hm-desktop-icon-label"}
	],

	create: function() {
		this.inherited(arguments);
		this.$.label.setContent(this.iconName);
		// Add icon-specific class for CSS fallback icons
		this.addClass("hm-desktop-icon-" + this.iconId);
	},

	rendered: function() {
		this.inherited(arguments);
		// Set background image for icon
		if (this.iconSrc) {
			this.$.image.applyStyle("background-image", "url(" + this.iconSrc + ")");
		}
	},

	/**
	 * Handle tap/click on icon
	 */
	clickHandler: function(inSender, inEvent) {
		this.doIconTap({iconId: this.iconId});
		return true;
	}
});
