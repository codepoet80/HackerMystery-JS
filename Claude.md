# Claude.md - Hacker Mystery 95

## Project Overview

A 1990s hacker-themed adventure game with a hybrid terminal/windowed interface reminiscent of early Macintosh computers and the movie "Hackers" (1995). Players explore a virtual filesystem, connect to BBS systems, and solve puzzles to uncover a conspiracy.

## Target Platform

**Primary Target: HP TouchPad running webOS/LuneOS**

webOS was HP/Palm's mobile operating system that used pure web technologies (HTML, CSS, JavaScript) for app development. The HP TouchPad (2011) was the last webOS device and runs on ARM silicon.

The webOS web renderer is based on **old WebKit (Safari 5-6 era)** with significant limitations.

**Secondary Targets:**
- Modern browsers (Chrome, Firefox, Safari)
- Android (via Cordova wrapper)

## Framework

This project uses **Enyo 1.0**, a cross-platform JavaScript framework originally developed by Palm/HP for webOS. The entire framework is included in `enyo-app/enyo/`.

Enyo uses a component-based architecture with:
- `enyo.kind()` for defining components
- `this.$` hash for accessing child components by name
- `createComponent()` for dynamic component creation
- `enyo.depends()` for dependency loading

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

Always include `-webkit-` prefixes for these properties:

```css
/* Transforms */
-webkit-transform: scale(2);
transform: scale(2);

/* Calc */
width: -webkit-calc(100% - 20px);
width: calc(100% - 20px);

/* Box sizing */
-webkit-box-sizing: border-box;
box-sizing: border-box;

/* Transitions */
-webkit-transition: opacity 0.3s;
transition: opacity 0.3s;

/* Animations - need BOTH property prefix AND @-webkit-keyframes */
-webkit-animation: blink 1s infinite;
animation: blink 1s infinite;

@-webkit-keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
```

### CSS: Gradients Don't Work

Old WebKit doesn't support CSS gradients reliably.

**Solution:** Use tiled data URI GIF/PNG images instead. You can use `@supports` to provide gradient overrides for modern browsers.

### CSS: Centering Without Flexbox

For vertical + horizontal centering:
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

| Avoid | Use Instead |
|-------|-------------|
| ✓ (U+2713) | √ (U+221A) |
| ✕ (U+2715) | x |
| → (U+2192) | -> |

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

## File Structure

```
HackerMystery-JS/
├── enyo-app/                    # Main application
│   ├── index.html               # Entry point with title screen
│   ├── depends.js               # Dependency loader
│   ├── appinfo.json             # webOS app metadata
│   ├── css/
│   │   ├── game.css             # Core layout
│   │   └── retro.css            # Retro Mac styling
│   ├── images/                  # Game images
│   ├── sounds/                  # Sound effects
│   ├── enyo/                    # Enyo 1.0 framework (don't modify)
│   └── source/
│       ├── App.js               # Main application shell
│       ├── core/
│       │   ├── GameState.js     # Singleton state manager
│       │   ├── SaveManager.js   # Save/load system
│       │   ├── PuzzleEngine.js  # Puzzle management
│       │   ├── BBSHandler.js    # BBS session handler
│       │   └── SoundManager.js  # Cross-compatible audio
│       ├── data/
│       │   ├── FileSystem.js    # Virtual filesystem
│       │   └── BBSData.js       # BBS content data
│       ├── programs/
│       │   ├── FileViewer.js    # File browser
│       │   └── TextEditor.js    # Text file viewer
│       └── ui/
│           ├── Desktop.js       # Desktop with icons
│           ├── MenuBar.js       # Mac-style menu bar
│           ├── Window.js        # Draggable windows
│           ├── WindowManager.js # Window lifecycle
│           └── Terminal.js      # Terminal emulator
├── cordova-wrapper/             # Android wrapper
├── build.sh                     # Build script
├── devlog.md                    # Development log
└── walkthru.md                  # Game walkthrough
```

## Building

```bash
# webOS/LuneOS
./build.sh webos

# Web
./build.sh www

# Android
./build.sh android
```

## Testing on webOS

- Use nginx with proper permissions for local development
- Ensure `_www` user has execute permission on all parent directories
- nginx config requires trailing slashes when using `alias` directive

## Game Architecture

### Singleton Pattern
Core systems use singleton pattern with `getInstance()`:
- `HackerMystery.GameState.getInstance()`
- `HackerMystery.SoundManager.getInstance()`
- `HackerMystery.PuzzleEngine.getInstance()`
- `HackerMystery.FileSystem.getInstance()`

### Component Ownership in Enyo
When using `createComponent()`, the `owner` property determines which component's `this.$` hash contains the new component. Components owned by a parent aren't destroyed when calling `destroyComponents()` on a container.

**Solution:** Track dynamically created components in an array and destroy manually.

## Current Status

- **Chapter 1:** Complete (5 puzzles)
- **Chapter 2:** Planning phase

See `devlog.md` for detailed development history and `walkthru.md` for game walkthrough.
