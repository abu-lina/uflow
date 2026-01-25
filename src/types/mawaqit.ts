/**
 * Mawaqit API types for prayer times integration
 */

export interface MawaqitMosque {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface PrayerTime {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah?: string;
  date?: string;
}

export interface MawaqitPrayerTimesResponse {
  mosque_id: string;
  mosque_name: string;
  date: string;
  prayer_times: PrayerTime;
  calculation_method?: string;
  timezone?: string;
}
