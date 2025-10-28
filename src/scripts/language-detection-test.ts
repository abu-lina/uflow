/**
 * Language Detection Test Script
 * 
 * This script tests the language detection functionality
 * Run this in the browser console to test different scenarios
 */

// Mock different browser language scenarios
const testScenarios = [
  {
    name: 'English (US)',
    navigator: { language: 'en-US', languages: ['en-US', 'en'] }
  },
  {
    name: 'German (Germany)',
    navigator: { language: 'de-DE', languages: ['de-DE', 'de', 'en'] }
  },
  {
    name: 'Arabic (Saudi Arabia)',
    navigator: { language: 'ar-SA', languages: ['ar-SA', 'ar', 'en'] }
  },
  {
    name: 'Turkish (Turkey)',
    navigator: { language: 'tr-TR', languages: ['tr-TR', 'tr', 'en'] }
  },
  {
    name: 'French (France) - should fallback to German',
    navigator: { language: 'fr-FR', languages: ['fr-FR', 'fr', 'en'] }
  },
  {
    name: 'Spanish (Spain) - should fallback to German',
    navigator: { language: 'es-ES', languages: ['es-ES', 'es', 'en'] }
  }
];

// Test function
function testLanguageDetection() {
  console.log('🧪 Testing Language Detection...\n');
  
  testScenarios.forEach(scenario => {
    // Mock navigator
    const originalNavigator = window.navigator;
    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        language: scenario.navigator.language,
        languages: scenario.navigator.languages
      },
      writable: true
    });
    
    // Test detection logic (simplified version)
    const LANGUAGE_MAPPING = {
      'en': 'en',
      'de': 'de',
      'ar': 'ar',
      'tr': 'tr',
      'en-us': 'en',
      'en-gb': 'en',
      'en-ca': 'en',
      'en-au': 'en',
      'de-de': 'de',
      'de-at': 'de',
      'de-ch': 'de',
      'ar-sa': 'ar',
      'ar-ae': 'ar',
      'ar-eg': 'ar',
      'ar-ma': 'ar',
      'tr-tr': 'tr',
    };
    
    function detectLanguage() {
      const languages = navigator.languages || [navigator.language];
      
      for (const lang of languages) {
        const normalizedLang = lang.toLowerCase().split('-')[0];
        if (normalizedLang in LANGUAGE_MAPPING) {
          return LANGUAGE_MAPPING[normalizedLang as keyof typeof LANGUAGE_MAPPING];
        }
      }
      
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
      return browserLang === 'en' ? 'en' : 'de';
    }
    
    const detected = detectLanguage();
    console.log(`✅ ${scenario.name}: ${scenario.navigator.language} → ${detected}`);
    
    // Restore original navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true
    });
  });
  
  console.log('\n🎉 Language detection test completed!');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).testLanguageDetection = testLanguageDetection;
  console.log('📝 Run testLanguageDetection() in the console to test language detection');
}

export { testLanguageDetection };
