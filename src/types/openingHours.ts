export interface OpeningHoursWindow {
  open: string;
  close: string;
}

export type OpeningHoursDay = OpeningHoursWindow | null;

export interface OpeningHours {
  monday?: OpeningHoursDay;
  tuesday?: OpeningHoursDay;
  wednesday?: OpeningHoursDay;
  thursday?: OpeningHoursDay;
  friday?: OpeningHoursDay;
  saturday?: OpeningHoursDay;
  sunday?: OpeningHoursDay;
}

export interface OpenStatusResult {
  visible: boolean;
  isOpen: boolean;
  nextChangeTime: string | null;
  nextChangeDay: keyof OpeningHours | null;
}