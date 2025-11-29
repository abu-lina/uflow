// Test script to demonstrate language detection
// Run this in the browser console to test different scenarios

function testLanguageDetection() {
  console.log('🧪 Testing Language Detection Scenarios');
  
  // Mock different navigator.language values
  const testCases = [
    { language: 'en-US', expected: 'English' },
    { language: 'de-DE', expected: 'German' },
    { language: 'fr-FR', expected: 'German (fallback)' },
    { language: 'en-GB', expected: 'English (country-based)' },
    { language: 'es-ES', expected: 'German (fallback)' },
    { language: 'ar-SA', expected: 'German (fallback)' },
  ];
  
  testCases.forEach(({ language, expected }) => {
    // Mock navigator.language
    const originalLanguage = navigator.language;
    Object.defineProperty(navigator, 'language', {
      value: language,
      writable: true
    });
    
    // Test detection logic
    const detected = detectSystemLanguage();
    console.log(`🌍 ${language} → ${detected} (${expected})`);
    
    // Restore original
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      writable: true
    });
  });
}

// Helper function to simulate the detection logic
function detectSystemLanguage() {
  const browserLanguage = navigator.language;
  const languageCode = browserLanguage.split('-')[0].toLowerCase();
  
  if (languageCode === 'en') return 'en';
  if (languageCode === 'de') return 'de';
  
  // Country-based detection
  const countryCode = browserLanguage.split('-')[1]?.toUpperCase();
  const englishCountries = ['US', 'GB', 'AU', 'CA', 'NZ', 'IE', 'ZA'];
  if (englishCountries.includes(countryCode)) {
    return 'en';
  }
  
  return 'de';
}

// Run the test
testLanguageDetection();

