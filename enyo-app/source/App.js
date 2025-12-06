/**
 * HackerMystery - Main Application Shell
 *
 * The root component that manages the game's main interface.
 * Renders a retro desktop environment with windowed programs.
 */
enyo.kind({
	name: "HackerMystery.App",
	kind: enyo.VFlexBox,
	className: "hm-app",

	components: [
		// Window manager handles all open windows
		{name: "windowManager", kind: "HackerMystery.WindowManager"},

		// Desktop with icons
		{name: "desktop", kind: "HackerMystery.Desktop", flex: 1,
			onLaunchProgram: "handleLaunchProgram"
		}
	],

	create: function() {
		this.inherited(arguments);
		enyo.log("HackerMystery starting up...");
	},

	rendered: function() {
		this.inherited(arguments);
		// Auto-launch terminal on startup for that authentic hacker feel
		this.launchProgram("terminal");
	},

	/**
	 * Handle program launch requests from desktop icons
	 */
	handleLaunchProgram: function(inSender, inEvent) {
		this.launchProgram(inEvent.program);
	},

	/**
	 * Launch a program by name
	 */
	launchProgram: function(programName) {
		var windowManager = this.$.windowManager;

		switch (programName) {
			case "terminal":
				windowManager.openWindow({
					title: "Terminal",
					kind: "HackerMystery.Terminal",
					width: 600,
					height: 384
				});
				break;
			// Future programs will be added here
			default:
				enyo.log("Unknown program: " + programName);
		}
	}
});
