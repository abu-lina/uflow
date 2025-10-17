# Safe Area Testing Guide

This guide shows you how to test safe area behavior in your browser for different iPhone models.

## Browser Testing Methods

### 1. Chrome DevTools Device Simulation

**Step 1: Open DevTools**
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Click the device toggle icon (📱) or press `Cmd+Shift+M`

**Step 2: Select iPhone Models**
- Choose from these models to test different safe areas:
  - **iPhone SE (3rd generation)**: Minimal safe areas (0px)
  - **iPhone 14 Pro**: Dynamic Island (44px top, 34px bottom)
  - **iPhone 15 Pro**: Dynamic Island (44px top, 34px bottom)
  - **iPhone 16 Pro**: Dynamic Island (44px top, 34px bottom)

**Step 3: Enable Safe Area Simulation**
- In DevTools Settings (⚙️) → **Experiments**
- Enable "CSS Overview" and "CSS Grid/Flexbox debugging"
- Look for "Safe area insets" in the rendering options

### 2. Manual CSS Testing

**Add Custom Safe Areas in DevTools Console:**
```javascript
// Simulate iPhone 16 Pro safe areas
document.documentElement.style.setProperty('--safe-area-inset-top', '44px');
document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px');
document.documentElement.style.setProperty('--safe-area-inset-left', '0px');
document.documentElement.style.setProperty('--safe-area-inset-right', '0px');

// Simulate iPhone SE safe areas
document.documentElement.style.setProperty('--safe-area-inset-top', '0px');
document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
document.documentElement.style.setProperty('--safe-area-inset-left', '0px');
document.documentElement.style.setProperty('--safe-area-inset-right', '0px');
```

### 3. Built-in Safe Area Tester

**Using the Safe Area Tester Component:**
1. The app includes a "Test Safe Areas" button (red button in top-right)
2. Click it to see visual overlay of safe areas
3. Shows actual `env()` values for all four sides
4. Only appears in development mode

### 4. CSS Custom Properties Testing

**Add to your browser's DevTools Console:**
```javascript
// Test different safe area scenarios
const testScenarios = {
  'iPhone SE': {
    top: '0px',
    bottom: '0px',
    left: '0px',
    right: '0px'
  },
  'iPhone 16 Pro': {
    top: '44px',
    bottom: '34px',
    left: '0px',
    right: '0px'
  },
  'iPhone 16 Pro Max': {
    top: '44px',
    bottom: '34px',
    left: '0px',
    right: '0px'
  }
};

// Apply a scenario
function applySafeArea(scenario) {
  Object.entries(testScenarios[scenario]).forEach(([side, value]) => {
    document.documentElement.style.setProperty(`--safe-area-inset-${side}`, value);
  });
}

// Usage
applySafeArea('iPhone 16 Pro');
```

## Testing Checklist

### Navigation Bar Testing
- [ ] Icons are properly positioned on iPhone SE (close to bottom)
- [ ] Icons are properly positioned on iPhone 16 Pro (below safe area)
- [ ] Navigation bar height adjusts correctly
- [ ] Content spacing works on all devices

### Header Testing
- [ ] Headers respect top safe area on iPhone 16 Pro
- [ ] Headers work normally on iPhone SE
- [ ] Fixed positioned elements don't overlap with notch/Dynamic Island

### Content Testing
- [ ] Main content has proper spacing from navigation
- [ ] Content doesn't get cut off by safe areas
- [ ] Scrolling works correctly with safe areas

## Browser-Specific Testing

### Chrome/Edge
- Best DevTools support
- Full device simulation
- Safe area visualization

### Firefox
- Basic device simulation
- Manual CSS testing required
- Use the Safe Area Tester component

### Safari
- Native safe area support
- Best for final testing
- Use responsive design mode

## Production Testing

### Real Device Testing
1. **iPhone SE**: Test minimal safe areas
2. **iPhone 14/15/16 Pro**: Test Dynamic Island
3. **iPad**: Test different orientations
4. **Android**: Test with different notch configurations

### PWA Testing
- Install as PWA on device
- Test in standalone mode
- Verify safe areas work in full-screen mode

## Troubleshooting

### Safe Areas Not Working
1. Check viewport meta tag: `viewport-fit=cover`
2. Verify CSS `env()` functions are supported
3. Test in Safari (best native support)

### Icons Too High/Low
1. Check navigation bar layout structure
2. Verify safe area utilities are applied correctly
3. Test with different device simulations

### Content Overlapping
1. Ensure proper spacing utilities are used
2. Check fixed positioned elements
3. Verify z-index values are correct
