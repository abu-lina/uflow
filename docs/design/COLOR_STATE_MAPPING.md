# Color State Mapping - Breaker Bay Palette

## Button States Reference

This document maps the `breaker-bay` color palette to standard UI button states.

---

## Current State Mapping

### For Primary Buttons (Dark Background, Light Text)

| State | Color | Hex | breaker-bay | Usage |
|-------|-------|-----|-------------|-------|
| **Default** | `primary.DEFAULT` | `#589d96` | `breaker-bay-400` | Base button color |
| **Hover** | `primary.dark` | `#438983` | `breaker-bay-500` | Slightly darker on hover |
| **Active/Pressed** | `primaryPressed` | `#49837D` | ~`breaker-bay-600` | When button is pressed/clicked |
| **Disabled** | `primary.DEFAULT` + opacity | `#589d96` at 50% | `breaker-bay-400/50` | Same color with 50% opacity |

### For Selected/Active States (Light Background, Dark Text)

| State | Color | Hex | breaker-bay | Usage |
|-------|-------|-----|-------------|-------|
| **Active/Selected** | `primary.active` | `#b8d6d2` | `breaker-bay-200` | Selected items, active tabs |
| **Active Hover** | `primary.active` + darker | `#8cbab3` | `breaker-bay-300` | Hover on active items |

---

## Current Implementation

### In Tailwind Config (`tailwind.config.ts`)

```typescript
primary: {
  DEFAULT: '#589d96', // breaker-bay-400 (default state)
  light: '#b8d6d2',   // breaker-bay-200 (light backgrounds)
  active: '#b8d6d2',  // breaker-bay-200 (active/selected state)
  dark: '#438983',    // breaker-bay-500 (hover state)
}
```

### In Constants (`src/constants/colors.ts`)

```typescript
primary: '#589D96',           // Default (breaker-bay-400)
primaryDark: '#4A8A84',      // Hover (approximately breaker-bay-500)
primaryPressed: '#49837D',    // Pressed/Active (between 500-600)
primaryActive: '#b8d6d2',     // Selected state (breaker-bay-200)
```

---

## Current Standard Mapping (✅ Implemented)

### Primary Buttons (Solid Background)

```typescript
primary: {
  DEFAULT: '#589d96',  // breaker-bay-400 - Default state
  hover: '#438983',    // breaker-bay-500 - Hover state
  pressed: '#356e6a',  // breaker-bay-600 - Pressed/Clicked state
  // Disabled: handled via opacity-50 utility
}
```

### Selected/Active Items (Light Background)

```typescript
primary: {
  active: '#b8d6d2',      // breaker-bay-200 - Selected/Active background
  activeHover: '#8cbab3', // breaker-bay-300 - Hover on active items
}
```

---

## Usage Examples

### Primary Button
```tsx
// Default
<button className="bg-primary text-white">
  Click me
</button>

// Hover
<button className="bg-primary text-white hover:bg-primary-dark">
  Click me
</button>

// Active/Pressed
<button className="bg-primary text-white active:bg-primary-active">
  Click me
</button>

// Disabled
<button className="bg-primary text-white disabled:opacity-50" disabled>
  Click me
</button>
```

### Selected/Active Item
```tsx
// Active state
<button className="bg-primary-active text-content-heading border border-primary">
  Selected Item
</button>
```

---

## Notes

1. **Disabled State**: Currently uses `disabled:opacity-50` which applies 50% opacity to the default color. This is standard practice.

2. **Active vs Selected**: 
   - **Active** (pressed): When button is being clicked (`active:` pseudo-class)
   - **Selected**: When an item is in a selected state (e.g., selected category)

3. **Color Progression**: 
   - Lighter shades (200-300) for backgrounds/selected states
   - Medium shades (400) for default
   - Darker shades (500-600) for hover/active states

---

## ✅ Implementation Complete (Best Practice)

All semantic tokens are now implemented using appearance-based naming:

```typescript
primary: {
  DEFAULT: '#589d96',  // breaker-bay-400 (base/default)
  light: '#b8d6d2',    // breaker-bay-200 (light backgrounds, selected states)
  dark: '#438983',     // breaker-bay-500 (hover states)
  darker: '#356e6a',   // breaker-bay-600 (pressed/clicked states)
  // Disabled handled via opacity-50 utility
}
```

### Usage Pattern (Best Practice)

**CSS pseudo-classes handle states, tokens provide colors:**

```tsx
// Primary button with all states
<button className="bg-primary text-white hover:bg-primary-dark active:bg-primary-darker">
  Click me
</button>

// Selected/active item (no pseudo-class - it's a state, not interaction)
<button className={isSelected ? 'bg-primary-light' : 'bg-white'}>
  Selected Item
</button>
```

### State Mapping

| State | CSS Pseudo-Class | Color Token | Usage |
|-------|------------------|-------------|-------|
| **Default** | (none) | `bg-primary` | Base button color |
| **Hover** | `hover:` | `hover:bg-primary-dark` | Mouse over |
| **Pressed** | `active:` | `active:bg-primary-darker` | Button being clicked |
| **Selected** | (conditional) | `bg-primary-light` | Selected item state |
| **Disabled** | `disabled:` | `disabled:opacity-50` | Disabled state |

### Benefits

✅ **No naming conflicts** - Tokens don't conflict with CSS pseudo-classes  
✅ **Consistent** - Matches status color pattern (`light`, `dark`)  
✅ **Clear intent** - Appearance-based names are self-documenting  
✅ **Flexible** - Can use any token with any pseudo-class

