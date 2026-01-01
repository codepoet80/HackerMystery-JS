# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hacker Mystery 95 is a 1990s hacker-themed adventure game with a hybrid terminal/windowed interface reminiscent of early Macintosh computers and the movie "Hackers" (1995). Players explore a virtual filesystem, connect to BBS systems, and solve puzzles to uncover a conspiracy.

## Target Platform

**Primary Target: HP TouchPad running webOS/LuneOS**

webOS was HP/Palm's mobile operating system that used pure web technologies (HTML, CSS, JavaScript) for app development. The HP TouchPad (2011) was the last webOS device and runs on ARM silicon.

The webOS web renderer is based on **old WebKit (Safari 5-6 era)** with significant limitations.

**Secondary Targets:**
- Modern browsers (Chrome, Firefox, Safari)
- Android (via Cordova wrapper)

## Framework

This project uses **Enyo 1.0**, a cross-platform JavaScript framework originally developed by Palm/HP for webOS. The entire framework is included in `enyo-app/enyo/` - do not modify it.

Enyo uses a component-based architecture with:
- `enyo.kind()` for defining components
- `this.$` hash for accessing child components by name
- `createComponent()` for dynamic component creation
- `enyo.depends()` for dependency loading

## Build Commands

```bash
./build.sh webos    # Build webOS/LuneOS .ipk package
./build.sh www      # Build web version to bin/www/
./build.sh android  # Build Android .apk via Cordova
./build.sh clean    # Remove all build artifacts
```

Multiple targets can be combined: `./build.sh webos www`

## Running Locally

Open `enyo-app/index.html` directly in a browser. Click the title screen to start the game.

For webOS testing with nginx, ensure `_www` user has execute permission on all parent directories. Use trailing slashes with `alias` directive.

## Critical Constraints

### JavaScript: ES5 ONLY

**NEVER use ES6+ features.** The old WebKit engine does not support them.

| Forbidden | Use Instead |
|-----------|-------------|
| `let`, `const` | `var` |
| Arrow functions `=>` | `function() {}` |
| Template literals `` `${}` `` | String concatenation `+` |
| `class` | `enyo.kind()` |
| `Promise`, `async/await` | Callbacks |
| `for...of` | `for (var i = 0; ...)` |
| Default parameters | `param = param \|\| default` |
| Destructuring | Manual property access |
| Spread operator `...` | `apply()` or manual |

### CSS: No Modern Layout

**No flexbox, grid, or CSS variables.** Old WebKit doesn't support them.

| Forbidden | Use Instead |
|-----------|-------------|
| `display: flex` | `display: table` / `table-cell`, floats, or absolute positioning |
| `display: grid` | Tables or floats |
| CSS variables `var(--x)` | Direct values |
| `gap` | `margin` or `padding` |
| `object-fit` | May not work; use background-image instead |

### CSS: Required Prefixes

Always include `-webkit-` prefixes for transforms, calc, box-sizing, transitions, and animations. Animations need both the property prefix AND `@-webkit-keyframes`.

### CSS: Gradients Don't Work

Old WebKit doesn't support CSS gradients reliably. Use tiled data URI GIF/PNG images instead. Use `@supports` to provide gradient overrides for modern browsers.

### CSS: Centering Without Flexbox

```css
.container {
    display: table;
    width: 100%;
    height: 100%;
}
.content {
    display: table-cell;
    vertical-align: middle;
    text-align: center;
}
```

### Character Encoding

Avoid Unicode characters outside basic Latin (U+0000-U+00FF). Old devices may not render newer Unicode symbols.

## Event Handling on Old WebKit

Enyo's onclick handlers can conflict with manual DOM event bindings. For complex interactive components, use manual DOM bindings in `rendered()`:

```javascript
rendered: function() {
    this.inherited(arguments);
    var self = this;
    var node = this.hasNode();
    if (node) {
        node.onclick = function(e) {
            e = e || window.event;
            e.preventDefault ? e.preventDefault() : e.returnValue = false;
            e.stopPropagation ? e.stopPropagation() : e.cancelBubble = true;
            self.handleClick(e);
        };
    }
}
```

## Audio on Old WebKit

- `cloneNode()` on Audio elements causes `INVALID_STATE_ERR`
- **Solution:** Create fresh `Audio()` element each time
- Wait for `canplay` event before calling `play()`
- Always wrap audio operations in try-catch
- Call `onEnded` callback even when audio fails so game logic continues

## Game Architecture

### Singleton Pattern

Core systems use singleton pattern with `getInstance()`:
- `HackerMystery.GameState.getInstance()` - State manager (inventory, flags, unlocked programs)
- `HackerMystery.SoundManager.getInstance()` - Cross-compatible audio
- `HackerMystery.PuzzleEngine.getInstance()` - Puzzle registration and completion
- `HackerMystery.FileSystem.getInstance()` - Virtual filesystem with locked/encrypted files

### Source Code Structure

```
enyo-app/source/
├── App.js               # Main application shell, window management
├── core/
│   ├── GameState.js     # Central state manager
│   ├── SaveManager.js   # Save/load system (localStorage)
│   ├── PuzzleEngine.js  # Puzzle management
│   ├── BBSHandler.js    # BBS session handler
│   └── SoundManager.js  # Cross-compatible audio
├── data/
│   ├── FileSystem.js    # Virtual filesystem
│   └── BBSData.js       # BBS content data
├── programs/
│   ├── FileViewer.js    # File browser
│   └── TextEditor.js    # Text file viewer
└── ui/
    ├── Desktop.js       # Desktop with icons
    ├── MenuBar.js       # Mac-style menu bar
    ├── Window.js        # Draggable windows
    ├── WindowManager.js # Window lifecycle
    └── Terminal.js      # Terminal emulator
```

### Component Ownership in Enyo

When using `createComponent()`, the `owner` property determines which component's `this.$` hash contains the new component. Components owned by a parent aren't destroyed when calling `destroyComponents()` on a container.

**Solution:** Track dynamically created components in an array and destroy manually.

## Current Status

- **Chapter 1:** Complete (5 puzzles)
- **Chapter 2:** Planning phase

See `devlog.md` for detailed development history and `walkthru.md` for game walkthrough.
