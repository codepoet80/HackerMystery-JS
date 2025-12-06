/**
 * HackerMystery.WindowManager
 *
 * Manages the stack of open program windows.
 * Handles z-order, positioning, and window lifecycle.
 */
enyo.kind({
	name: "HackerMystery.WindowManager",
	kind: enyo.Control,
	className: "hm-window-manager",

	// Track open windows
	windows: null,
	nextWindowId: 1,
	baseZIndex: 100,
	windowOffset: 30,  // Cascade offset for new windows

	create: function() {
		this.inherited(arguments);
		this.windows = [];
	},

	/**
	 * Open a new window
	 * @param {Object} config - Window configuration
	 * @param {string} config.title - Window title
	 * @param {string} config.kind - Component kind for window content
	 * @param {number} config.width - Window width in pixels
	 * @param {number} config.height - Window height in pixels
	 */
	openWindow: function(config) {
		var windowId = "window_" + this.nextWindowId++;
		var windowCount = this.windows.length;

		// Calculate position with cascade offset
		var left = 50 + (windowCount * this.windowOffset);
		var top = 50 + (windowCount * this.windowOffset);

		// Wrap around if too many windows
		if (left > 300) {
			left = 50 + ((windowCount % 5) * this.windowOffset);
			top = 50 + ((windowCount % 5) * this.windowOffset);
		}

		var windowComponent = this.createComponent({
			name: windowId,
			kind: "HackerMystery.Window",
			windowId: windowId,
			title: config.title || "Window",
			windowWidth: config.width || 400,
			windowHeight: config.height || 300,
			left: left,
			top: top,
			contentKind: config.kind,
			onClose: "handleWindowClose",
			onFocus: "handleWindowFocus"
		});

		this.windows.push({
			id: windowId,
			component: windowComponent
		});

		windowComponent.render();
		this.bringToFront(windowId);

		return windowComponent;
	},

	/**
	 * Close a window by ID
	 */
	closeWindow: function(windowId) {
		var index = -1;
		for (var i = 0; i < this.windows.length; i++) {
			if (this.windows[i].id === windowId) {
				index = i;
				break;
			}
		}

		if (index >= 0) {
			var windowInfo = this.windows[index];
			windowInfo.component.destroy();
			this.windows.splice(index, 1);
		}
	},

	/**
	 * Bring a window to the front of the stack
	 */
	bringToFront: function(windowId) {
		// Find and move window to end of array
		var index = -1;
		for (var i = 0; i < this.windows.length; i++) {
			if (this.windows[i].id === windowId) {
				index = i;
				break;
			}
		}

		if (index >= 0 && index < this.windows.length - 1) {
			var windowInfo = this.windows.splice(index, 1)[0];
			this.windows.push(windowInfo);
		}

		// Update z-indices
		for (var j = 0; j < this.windows.length; j++) {
			var zIndex = this.baseZIndex + j;
			this.windows[j].component.setZIndex(zIndex);
		}
	},

	/**
	 * Handle window close event
	 */
	handleWindowClose: function(inSender, inEvent) {
		this.closeWindow(inEvent.windowId);
	},

	/**
	 * Handle window focus (click/tap on window)
	 */
	handleWindowFocus: function(inSender, inEvent) {
		this.bringToFront(inEvent.windowId);
	}
});
