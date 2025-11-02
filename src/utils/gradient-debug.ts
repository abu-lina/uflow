/**
 * Gradient debugging utilities
 * Use these in DevTools console to inspect gradient styles
 */

export function inspectGradient(element: HTMLElement | null) {
  if (!element) {
    console.error('Element not found');
    return;
  }

  const computed = window.getComputedStyle(element);
  
  console.group('🔍 Gradient Inspection');
  console.log('Element:', element);
  console.log('Background:', computed.background);
  console.log('Background Image:', computed.backgroundImage);
  console.log('Opacity:', computed.opacity);
  console.log('Filter:', computed.filter);
  console.log('Mix Blend Mode:', computed.mixBlendMode);
  console.log('Isolation:', computed.isolation);
  
  // Check parent opacity chain
  console.group('📊 Parent Opacity Chain');
  let parent: HTMLElement | null = element.parentElement;
  let level = 0;
  let totalOpacity = parseFloat(computed.opacity);
  
  while (parent && level < 10) {
    const parentComputed = window.getComputedStyle(parent);
    const parentOpacity = parseFloat(parentComputed.opacity);
    totalOpacity *= parentOpacity;
    
    if (parentOpacity < 1) {
      console.warn(`⚠️ Level ${level} (${parent.tagName}.${parent.className}): opacity=${parentOpacity}`);
    } else {
      console.log(`✓ Level ${level} (${parent.tagName}): opacity=${parentOpacity}`);
    }
    
    parent = parent.parentElement;
    level++;
  }
  
  console.log(`\n📉 Total Effective Opacity: ${totalOpacity.toFixed(3)}`);
  if (totalOpacity < 0.99) {
    console.error('❌ GRADIENT IS BEING DIMMED BY PARENT OPACITY!');
  } else {
    console.log('✓ No opacity issues detected');
  }
  console.groupEnd();
  
  console.groupEnd();
}

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  (window as typeof window & { inspectGradient?: typeof inspectGradient }).inspectGradient = inspectGradient;
}

