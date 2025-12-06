/**
 * HackerMystery.FileViewer
 *
 * Classic Finder-style file browser with icon grid.
 * Allows navigation through the virtual filesystem.
 */
enyo.kind({
	name: "HackerMystery.FileViewer",
	kind: enyo.VFlexBox,
	className: "hm-fileviewer",

	// Current path being viewed
	currentPath: null,

	// Whether to show hidden files
	showHidden: false,

	// Track created file icons for cleanup
	fileIcons: null,

	// Track last tap for double-tap detection
	lastTapTime: 0,
	lastTapTarget: null,
	doubleTapDelay: 400,

	events: {
		onOpenFile: ""
	},

	components: [
		// Path bar
		{name: "pathBar", kind: enyo.Control, className: "hm-fileviewer-pathbar",
			components: [
				{name: "pathText", kind: enyo.Control, className: "hm-fileviewer-path"}
			]
		},
		// File grid (scrollable)
		{name: "scroller", kind: enyo.Scroller, flex: 1, className: "hm-fileviewer-scroller",
			components: [
				{name: "fileGrid", kind: enyo.Control, className: "hm-fileviewer-grid"}
			]
		}
	],

	create: function() {
		this.inherited(arguments);
		this.currentPath = "/home";
		this.fileIcons = [];
	},

	rendered: function() {
		this.inherited(arguments);
		this.navigateTo(this.currentPath);
	},

	/**
	 * Navigate to a folder path
	 */
	navigateTo: function(path) {
		var fs = HackerMystery.FileSystem.getInstance();
		var items = fs.listFolder(path, this.showHidden);

		if (!items) {
			enyo.log("FileViewer: Invalid path " + path);
			return;
		}

		this.currentPath = path;
		this.$.pathText.setContent(path);
		this.renderFiles(items);
	},

	/**
	 * Toggle showing hidden files and refresh the view
	 * Returns the new showHidden state
	 */
	toggleShowHidden: function() {
		this.showHidden = !this.showHidden;
		this.navigateTo(this.currentPath);
		return this.showHidden;
	},

	/**
	 * Render file icons in the grid
	 */
	renderFiles: function(items) {
		// Destroy previously created icons
		for (var i = 0; i < this.fileIcons.length; i++) {
			this.fileIcons[i].destroy();
		}
		this.fileIcons = [];

		// Clear DOM just in case
		var gridNode = this.$.fileGrid.hasNode();
		if (gridNode) {
			gridNode.innerHTML = "";
		}

		// Add parent folder link if not at root
		if (this.currentPath !== "/home") {
			var parentIcon = this.$.fileGrid.createComponent({
				kind: "HackerMystery.FileIcon",
				fileName: "..",
				fileType: "folder",
				isParent: true,
				onIconTap: "handleIconTap",
				owner: this
			});
			this.fileIcons.push(parentIcon);
		}

		// Add file/folder icons
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var icon = this.$.fileGrid.createComponent({
				kind: "HackerMystery.FileIcon",
				fileName: item.name,
				fileType: item.type,
				isLocked: item.locked,
				isHidden: item.hidden,
				onIconTap: "handleIconTap",
				owner: this
			});
			this.fileIcons.push(icon);
		}

		this.$.fileGrid.render();
	},

	/**
	 * Handle icon tap - double-tap to open
	 */
	handleIconTap: function(inSender, inEvent) {
		var now = Date.now();
		var target = inEvent.fileName;

		// Check for double-tap
		if (this.lastTapTarget === target &&
			(now - this.lastTapTime) < this.doubleTapDelay) {
			// Double-tap detected
			this.openItem(inEvent.fileName, inEvent.fileType, inEvent.isParent);
			this.lastTapTime = 0;
			this.lastTapTarget = null;
		} else {
			// First tap
			this.lastTapTime = now;
			this.lastTapTarget = target;
			// Visual selection feedback
			this.selectIcon(inSender);
		}

		return true;
	},

	/**
	 * Select an icon (visual feedback)
	 */
	selectIcon: function(icon) {
		// Deselect all icons
		for (var i = 0; i < this.fileIcons.length; i++) {
			this.fileIcons[i].setSelected(false);
		}
		// Select this one
		icon.setSelected(true);
	},

	/**
	 * Open a file or folder
	 */
	openItem: function(name, type, isParent) {
		if (isParent) {
			// Navigate to parent folder
			var parentPath = this.currentPath.substring(0, this.currentPath.lastIndexOf("/"));
			if (!parentPath) parentPath = "/home";
			this.navigateTo(parentPath);
			return;
		}

		var fullPath = this.currentPath + "/" + name;

		if (type === "folder") {
			this.navigateTo(fullPath);
		} else {
			// Open file in text editor
			this.doOpenFile({
				path: fullPath,
				name: name,
				type: type
			});
		}
	}
});

/**
 * HackerMystery.FileIcon
 *
 * Individual file/folder icon for the grid
 */
enyo.kind({
	name: "HackerMystery.FileIcon",
	kind: enyo.Control,
	className: "hm-fileicon",

	published: {
		fileName: "",
		fileType: "text",
		isLocked: false,
		isHidden: false,
		isParent: false,
		selected: false
	},

	events: {
		onIconTap: ""
	},

	components: [
		{name: "icon", kind: enyo.Control, className: "hm-fileicon-image"},
		{name: "label", kind: enyo.Control, className: "hm-fileicon-label"}
	],

	create: function() {
		this.inherited(arguments);
		this.updateDisplay();
	},

	rendered: function() {
		this.inherited(arguments);
		this.updateDisplay();

		// Bind click event manually to avoid touch/click double-firing
		var self = this;
		var node = this.hasNode();
		if (node) {
			node.onclick = function(e) {
				self.handleTap(e);
			};
		}
	},

	updateDisplay: function() {
		// Set label
		var displayName = this.fileName;
		if (this.isLocked) {
			displayName += " [locked]";
		}
		this.$.label.setContent(displayName);

		// Set icon class based on type
		var iconClass = "hm-fileicon-image";
		if (this.isParent) {
			iconClass += " hm-fileicon-parent";
		} else if (this.fileType === "folder") {
			iconClass += " hm-fileicon-folder";
		} else if (this.fileType === "encrypted") {
			iconClass += " hm-fileicon-encrypted";
		} else {
			iconClass += " hm-fileicon-text";
		}

		if (this.isLocked) {
			iconClass += " hm-fileicon-locked";
		}
		if (this.isHidden) {
			iconClass += " hm-fileicon-hidden";
		}

		this.$.icon.setClassName(iconClass);
	},

	selectedChanged: function() {
		if (this.selected) {
			this.addClass("hm-fileicon-selected");
		} else {
			this.removeClass("hm-fileicon-selected");
		}
	},

	/**
	 * Handle click/tap
	 */
	handleTap: function(inEvent) {
		this.doIconTap({
			fileName: this.fileName,
			fileType: this.fileType,
			isParent: this.isParent,
			isLocked: this.isLocked
		});
		if (inEvent) {
			inEvent.stopPropagation();
		}
		return true;
	}
});
