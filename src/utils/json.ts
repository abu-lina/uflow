export function safeJsonParse<T>(json: string, guard: (parsed: unknown) => parsed is T): T | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (guard(parsed)) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}
