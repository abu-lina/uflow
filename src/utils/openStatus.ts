import type {
  OpenStatusResult,
  OpeningHours,
  OpeningHoursDay,
  OpeningHoursWindow,
} from '@/types/openingHours';

const DAYS: Array<keyof OpeningHours> = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const HIDDEN_RESULT: OpenStatusResult = {
  visible: false,
  isOpen: false,
  nextChangeTime: null,
  nextChangeDay: null,
};

function parseTimeToMinutes(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

function isWindow(value: unknown): value is OpeningHoursWindow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { open?: unknown; close?: unknown };
  return typeof candidate.open === 'string' && typeof candidate.close === 'string';
}

function formatTime(value: string): string {
  return value;
}

function getDayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getDayWindow(openingHours: OpeningHours, dayIndex: number): OpeningHoursDay | undefined {
  const dayKey = DAYS[dayIndex];
  return openingHours[dayKey];
}

function getOvernightCarryoverCloseTime(
  openingHours: OpeningHours,
  todayIndex: number,
  nowMinutes: number,
): string | null {
  const previousDayIndex = (todayIndex + 6) % 7;
  const previousWindow = getDayWindow(openingHours, previousDayIndex);

  if (!isWindow(previousWindow)) {
    return null;
  }

  const openMinutes = parseTimeToMinutes(previousWindow.open);
  const closeMinutes = parseTimeToMinutes(previousWindow.close);

  if (openMinutes === null || closeMinutes === null) {
    return null;
  }

  const isOvernight = closeMinutes <= openMinutes;
  if (!isOvernight) {
    return null;
  }

  return nowMinutes < closeMinutes ? previousWindow.close : null;
}

function findNextOpening(
  openingHours: OpeningHours,
  startDayIndex: number,
  nowMinutes: number,
): { dayOffset: number; dayKey: keyof OpeningHours; time: string } | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const dayIndex = (startDayIndex + offset) % 7;
    const dayWindow = getDayWindow(openingHours, dayIndex);

    if (!isWindow(dayWindow)) {
      continue;
    }

    const openMinutes = parseTimeToMinutes(dayWindow.open);
    if (openMinutes === null) {
      continue;
    }

    if (offset === 0 && openMinutes <= nowMinutes) {
      continue;
    }

    return {
      dayOffset: offset,
      dayKey: DAYS[dayIndex],
      time: dayWindow.open,
    };
  }

  return null;
}

export function getOpenStatus(
  openingHours: OpeningHours | Record<string, unknown> | null | undefined,
  now: Date = new Date(),
): OpenStatusResult {
  if (!openingHours || typeof openingHours !== 'object') {
    return HIDDEN_RESULT;
  }

  const hours = openingHours as OpeningHours;
  const todayIndex = getDayIndex(now);
  const todayWindow = getDayWindow(hours, todayIndex);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const carryoverCloseTime = getOvernightCarryoverCloseTime(hours, todayIndex, nowMinutes);

  if (carryoverCloseTime) {
    return {
      visible: true,
      isOpen: true,
      nextChangeTime: formatTime(carryoverCloseTime),
      nextChangeDay: null,
    };
  }

  if (!todayWindow) {
    const nextOpening = findNextOpening(hours, todayIndex, nowMinutes);
    if (!nextOpening) {
      return HIDDEN_RESULT;
    }

    return {
      visible: true,
      isOpen: false,
      nextChangeTime: formatTime(nextOpening.time),
      nextChangeDay: nextOpening.dayOffset === 1 ? null : nextOpening.dayKey,
    };
  }

  if (!isWindow(todayWindow)) {
    return HIDDEN_RESULT;
  }

  const openMinutes = parseTimeToMinutes(todayWindow.open);
  const closeMinutes = parseTimeToMinutes(todayWindow.close);
  if (openMinutes === null || closeMinutes === null) {
    return HIDDEN_RESULT;
  }

  const isOvernight = closeMinutes <= openMinutes;
  const isOpen = isOvernight
    ? nowMinutes >= openMinutes || nowMinutes < closeMinutes
    : nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  if (isOpen) {
    return {
      visible: true,
      isOpen: true,
      nextChangeTime: formatTime(todayWindow.close),
      nextChangeDay: null,
    };
  }

  const nextOpening = findNextOpening(hours, todayIndex, nowMinutes);
  if (!nextOpening) {
    return HIDDEN_RESULT;
  }

  return {
    visible: true,
    isOpen: false,
    nextChangeTime: formatTime(nextOpening.time),
    nextChangeDay: nextOpening.dayOffset === 1 ? null : nextOpening.dayKey,
  };
}