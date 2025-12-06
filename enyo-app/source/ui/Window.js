/**
 * HackerMystery.Window
 *
 * A draggable window component with Mac-style chrome.
 * Features title bar with stripes, close button, and content area.
 */
enyo.kind({
	name: "HackerMystery.Window",
	kind: enyo.Control,
	className: "hm-window",

	published: {
		windowId: "",
		title: "Window",
		windowWidth: 400,
		windowHeight: 300,
		left: 50,
		top: 50,
		contentKind: null
	},

	events: {
		onClose: "",
		onFocus: ""
	},

	components: [
		// Title bar (draggable area)
		{name: "titleBar", kind: enyo.Control, className: "hm-window-titlebar",
			onmousedown: "handleTitleMouseDown",
			components: [
				{name: "closeBox", kind: enyo.Control, className: "hm-window-close",
					onclick: "handleClose"
				},
				{name: "titleText", kind: enyo.Control, className: "hm-window-title",
					content: ""
				}
			]
		},
		// Content area
		{name: "content", kind: enyo.Control, className: "hm-window-content"}
	],

	// Drag state
	dragging: false,
	dragStartX: 0,
	dragStartY: 0,
	windowStartX: 0,
	windowStartY: 0,

	create: function() {
		this.inherited(arguments);
		this.$.titleText.setContent(this.title);

		// Create content component if specified
		if (this.contentKind) {
			this.$.content.createComponent({
				kind: this.contentKind,
				owner: this
			});
		}
	},

	rendered: function() {
		this.inherited(arguments);
		this.updatePosition();
		this.updateSize();

		// Bind document-level mouse events for dragging
		this.boundMouseMove = enyo.bind(this, "handleMouseMove");
		this.boundMouseUp = enyo.bind(this, "handleMouseUp");
	},

	/**
	 * Update window position
	 */
	updatePosition: function() {
		this.applyStyle("left", this.left + "px");
		this.applyStyle("top", this.top + "px");
	},

	/**
	 * Update window size
	 */
	updateSize: function() {
		this.applyStyle("width", this.windowWidth + "px");
		this.applyStyle("height", this.windowHeight + "px");
	},

	/**
	 * Set z-index for stacking
	 */
	setZIndex: function(zIndex) {
		this.applyStyle("z-index", zIndex);
	},

	/**
	 * Handle close button click
	 */
	handleClose: function(inSender, inEvent) {
		this.doClose({windowId: this.windowId});
		// Prevent event from bubbling to title bar
		return true;
	},

	/**
	 * Handle mouse/touch down on title bar
	 */
	handleTitleMouseDown: function(inSender, inEvent) {
		// Don't start drag if clicking close button
		if (inEvent.target === this.$.closeBox.hasNode()) {
			return;
		}

		// Signal that this window should come to front
		this.doFocus({windowId: this.windowId});

		this.dragging = true;

		// Get starting positions
		var pageX = inEvent.pageX || (inEvent.touches && inEvent.touches[0].pageX) || 0;
		var pageY = inEvent.pageY || (inEvent.touches && inEvent.touches[0].pageY) || 0;

		this.dragStartX = pageX;
		this.dragStartY = pageY;
		this.windowStartX = this.left;
		this.windowStartY = this.top;

		// Add document-level listeners for drag
		document.addEventListener("mousemove", this.boundMouseMove, true);
		document.addEventListener("mouseup", this.boundMouseUp, true);
		document.addEventListener("touchmove", this.boundMouseMove, true);
		document.addEventListener("touchend", this.boundMouseUp, true);

		// Prevent text selection during drag
		inEvent.preventDefault();
		return true;
	},

	/**
	 * Handle mouse/touch move during drag
	 */
	handleMouseMove: function(inEvent) {
		if (!this.dragging) return;

		var pageX = inEvent.pageX || (inEvent.touches && inEvent.touches[0].pageX) || 0;
		var pageY = inEvent.pageY || (inEvent.touches && inEvent.touches[0].pageY) || 0;

		var deltaX = pageX - this.dragStartX;
		var deltaY = pageY - this.dragStartY;

		this.left = this.windowStartX + deltaX;
		this.top = this.windowStartY + deltaY;

		// Keep window on screen (at least title bar visible)
		if (this.top < 0) this.top = 0;
		if (this.left < -this.windowWidth + 50) this.left = -this.windowWidth + 50;

		this.updatePosition();

		inEvent.preventDefault();
	},

	/**
	 * Handle mouse/touch up to end drag
	 */
	handleMouseUp: function(inEvent) {
		if (!this.dragging) return;

		this.dragging = false;

		// Remove document-level listeners
		document.removeEventListener("mousemove", this.boundMouseMove, true);
		document.removeEventListener("mouseup", this.boundMouseUp, true);
		document.removeEventListener("touchmove", this.boundMouseMove, true);
		document.removeEventListener("touchend", this.boundMouseUp, true);
	},

	/**
	 * Handle click anywhere on window (for focus)
	 */
	clickHandler: function(inSender, inEvent) {
		this.doFocus({windowId: this.windowId});
	},

	destroy: function() {
		// Clean up event listeners
		if (this.boundMouseMove) {
			document.removeEventListener("mousemove", this.boundMouseMove, true);
			document.removeEventListener("mouseup", this.boundMouseUp, true);
			document.removeEventListener("touchmove", this.boundMouseMove, true);
			document.removeEventListener("touchend", this.boundMouseUp, true);
		}
		this.inherited(arguments);
	}
});
