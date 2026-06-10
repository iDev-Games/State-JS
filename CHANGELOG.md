# Changelog

All notable changes to State.js will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
