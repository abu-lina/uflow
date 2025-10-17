# Feature Backlog

## Location/Address Improvements

### Current State
- Simple text inputs for city and country
- Basic presence validation only
- No autocomplete or suggestions

### Future Enhancement Options

#### Option 1: Address API Integration (Recommended)
**Best Practice:** Use Google Places, Mapbox, or OpenStreetMap for real-time address autocomplete

**Benefits:**
- ✅ Professional UX (like Uber, Airbnb)
- ✅ Real location validation
- ✅ Geocoding (lat/lng coordinates)
- ✅ International support
- ✅ Always up-to-date data
- ✅ Reduces user errors

**Implementation:**
- Integrate Mapbox Geocoding API (100k free requests/month)
- OR Google Places Autocomplete ($200/month free tier)
- OR OpenStreetMap Nominatim (free, rate-limited)

**Estimated Effort:** 2-3 days
**Priority:** Medium (nice-to-have UX improvement)

#### Option 2: Native Dropdowns
**Simpler Approach:** Use `<select>` for country, free text for city

**Benefits:**
- ✅ Quick to implement
- ✅ Mobile-friendly
- ✅ No external dependencies
- ✅ Works offline

**Cons:**
- ❌ City dropdown would be too large
- ❌ Less modern UX

**Estimated Effort:** 4-6 hours
**Priority:** Low

### Related Files
- `src/features/providers/ProviderCreateForm.tsx` - Location step
- `src/lib/validations/location.ts` - Can be used for basic validation if needed
- `src/providers/form-provider.tsx` - Form state management

### Notes
- Current implementation is sufficient for MVP
- Address API integration should be prioritized when:
  - User feedback indicates confusion
  - Adding map features
  - Expanding internationally
  - Budget allows for API costs

### Resources
- [Mapbox Geocoding API Docs](https://docs.mapbox.com/api/search/geocoding/)
- [Google Places Autocomplete](https://developers.google.com/maps/documentation/places/web-service/autocomplete)
- [react-places-autocomplete](https://github.com/hibiken/react-places-autocomplete)
- [use-places-autocomplete](https://github.com/wellyshen/use-places-autocomplete)

