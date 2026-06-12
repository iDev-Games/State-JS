# Changelog

All notable changes to State.js will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2025-01-XX

### Added
- **Expression-Based Templates**: Blade-like templating with computed values, string concatenation, and conditional logic
- Enhanced `data-state-text` to support full expressions within `{...}` blocks
- String concatenation support in expressions using `+` operator
- Conditional text display using ternary operators: `{health > 0 ? health + 'hp' : 'DEAD'}`
- Computed expressions in templates: `{30 + (level - 1) * 10}hp`
- Multiple expressions in single template: `"Level {level} - {xp}/{xpMax} XP"`
- String concatenation in `data-state-compute` for creating computed string attributes
- Auto-detection of string vs numeric addition (if either operand is string, concatenates)

### Changed
- `_parseExpression` now handles string concatenation intelligently
- `updateTextElement` rewritten to parse expressions instead of simple token replacement
- Expression parser returns strings, numbers, or booleans (not just truthy values)
- `data-state-text` backward compatible - simple `{attr}` tokens still work

### Technical
- Modified `parseAddSub` function to detect string types and concatenate accordingly
- Uses existing expression parser infrastructure (no new dependencies)
- Zero-dependency string operations

### Documentation
- Added comprehensive Expression-Based Templates section to README
- Added interactive expression demo to index.html (Extension 5.8)
- Documented string concatenation syntax and use cases
- Added examples for game development, dynamic UIs, and form validation
- Clarified that this solves CSS `content` property limitations (cannot use `calc()` or concatenate)

### Why v1.6.0?
- New capability: expression-based templates fundamentally extends what you can do with `data-state-text`
- Backward compatible: existing simple token syntax `{attr}` still works
- Solves CSS limitations that were previously impossible to work around
- Blade-like feel without custom HTML elements (stays true to attribute-based philosophy)

## [1.5.1] - 2025-01-XX

### Added
- **Random Number Generation**: Generate random numbers declaratively for game development
- New `data-state-random="max"` attribute for dice shorthand (1 to max)
- New `data-state-random="min,max"` attribute for explicit ranges
- Dice shorthand support: `data-state-random="6"` generates 1-6 (common d6)
- Explicit range support: `data-state-random="0,100"` generates 0-100 (percentages)
- Works seamlessly with triggers, chains, conditions, intervals, and instantiate
- Uses native `Math.random()` - zero dependencies

### Documentation
- **Important Notes section** added to README covering common gotchas and advanced patterns:
  - Data attribute naming (HTML lowercase requirement)
  - Trigger chain atomicity (non-transactional behavior)
  - `data-state-value` numeric and boolean duality
  - Autofire edge cases (won't re-trigger if condition already true at page load)
  - Instantiate display content examples (beyond game attributes)
- Added comprehensive random number generation documentation
- Added interactive dice roller demo to index.html
- Improved documentation clarity for instance management display content use cases

### Changed
- Updated version to v1.5.1 across all files

## [1.5.0] - 2025-01-XX

### Added
- **Instance Management System**: Dynamically create and remove DOM elements using declarative triggers
- New `data-state-instantiate="id"` attribute to clone elements by ID
- New `data-state-remove="selector"` attribute to remove elements by ID or CSS selector
- New `data-state-target="selector"` attribute to specify where cloned elements are inserted
- New `data-state-insert="mode"` attribute with modes: append, prepend, before, after
- New `data-state-set-*="value"` attributes to override attributes on cloned instances
- Automatic unique ID generation for cloned elements (e.g., `enemy-1`, `enemy-2`)
- Automatic instance counting on source elements via `data-{sourceId}Count` attribute
- Conditional removal support using `data-state-condition` with remove triggers
- Auto-initialization of State.js on all cloned elements

### Security
- Uses `DOMParser` for secure element cloning (consistent with v1.4.2 HTML includes)
- No `innerHTML` usage in cloning operations
- XSS-safe and CSP-compliant

### Changed
- Updated documentation with comprehensive instance management examples
- Added interactive demo in index.html showcasing enemy spawner system

## [1.4.2] - 2025-01-XX

### Security
- **BREAKING**: External file fetches (`data-state-include="path.html"`) are now **disabled by default** to prevent DOM-based XSS attacks
- Added `allowExternalIncludes` flag - must be explicitly enabled to fetch external files
- Template-based includes (`data-state-include="#id"`) remain enabled and safe by default
- Added optional DOMPurify integration - auto-sanitizes HTML if DOMPurify is loaded
- Added security warnings to console when external fetches are attempted without opt-in

### Added
- New `state.allowExternalIncludes` property to opt-in to external file fetching
- DOMPurify as optional peer dependency for enhanced security
- Security documentation section in README
- SECURITY.md file with security policy

### Changed
- External HTML includes now require explicit opt-in for security
- Updated documentation with security best practices

## [1.4.1] - 2025-01-XX

### Security
- Fixed Content Security Policy (CSP) compatibility by removing `eval()` usage
- Implemented custom expression parser (`_parseExpression`) to safely evaluate conditions and computed state
- All dynamic code execution now uses safe parsing instead of `eval()` or `Function()` constructor

### Changed
- Refactored condition evaluation to use tokenizer/parser instead of `eval()`
- Improved expression parsing with support for ternary operators, logical operators, and arithmetic

## [1.4.0] - 2025-01-XX

### Added
- **Event-Based Triggers**: Triggers can now fire on any DOM event, not just clicks
  - New `data-state-trigger-on` attribute (supports `input`, `focus`, `mouseenter`, `scroll`, `submit`, etc.)
  - Defaults to `click` for backward compatibility
- **Debounce Support**: New `data-state-debounce` attribute to delay trigger execution
- **Throttle Support**: New `data-state-throttle` attribute to limit trigger firing rate
- **Custom `intersect` Event**: Fires when elements become visible via IntersectionObserver
- **Auto preventDefault**: Form `submit` events automatically prevent page reload

### Changed
- Updated documentation with event-based trigger examples
- Added interactive event trigger demo to index.html

## [1.3.5] - 2024-XX-XX

### Fixed
- Fixed interval triggers with conditions for turn-based combat systems
- Fixed timer reset bug where `lastFire` was being reset every scheduler tick
- Fixed race condition where all intervals fired simultaneously when condition became true
- Fixed camelCase vs lowercase attribute name issues with toggles
- Added condition state tracking with `lastConditionState` to detect false→true transitions

### Changed
- All toggle attribute names now converted to lowercase for consistency

## [1.3.4] - 2024-XX-XX

### Fixed
- Restructured interval scheduler to check conditions every tick instead of only when interval elapsed
- Intervals now count from when they're eligible instead of page load

## [1.3.3] - 2024-XX-XX

### Fixed
- Initialize `lastConditionState` by evaluating the condition at setup time instead of hardcoding to false
- Prevents incorrect condition transition detection

## [1.3.2] - 2024-XX-XX

### Fixed
- Fixed timer reset bug in interval triggers - only reset `lastFire` when trigger actually fires

## [1.3.1] - 2024-XX-XX

### Fixed
- Fixed computed state expression parsing breaking on comparison operators (`<=`, `>=`, `==`, `!=`)
- Changed from `split('=')` to `indexOf('=')` + `substring()` to only split on first `=`

## [1.3.0] - 2024-XX-XX

### Added
- **Computed State**: `data-state-compute` for automatic derived value calculations
- **Debug API**: `State.inspect()`, `State.inspectAll()`, and `State.trace()` for debugging

## [1.2.0] - 2024-XX-XX

### Added
- **HTML Includes**: `data-state-include` for component-based development
- Template-based includes (`#id`) for instant, zero-latency components
- External file includes with caching

## [1.1.0] - 2024-XX-XX

### Added
- **Interval Triggers**: `data-state-interval` for repeating timer-based triggers
- **data-state-set**: Set attribute to exact value (supports `calc()`)
- **data-state-text**: Template string interpolation with `{token}` syntax
- **Conditional CSS Classes**: `data-state-class` with conditions
- **Procedural Sound Effects**: `data-state-sound` with Web Audio API
- **localStorage Persistence**: `data-state-persist` for save/restore
- **Custom Events**: `data-state-event` to dispatch CustomEvents

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Core state management with CSS variables
- Data attribute watching
- Form input binding
- Media element tracking
- Trigger system with increment/decrement/toggle
- Conditional triggers
- Trigger chains
- Auto-firing triggers
