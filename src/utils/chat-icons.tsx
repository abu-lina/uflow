import type { ReactElement } from 'react';
import { UtensilsCrossed, MapPin, Plus, Sparkles } from 'lucide-react';

/**
 * Maps an option string to a recommendation icon based on content keywords.
 * Covers common LLM output patterns for cuisine, city, registration, and generic options.
 * The keyword list is intentionally incomplete — extend as needed.
 */
export function getRecommendationIcon(option: string): ReactElement {
  const lower = option.toLowerCase();

  // Food/cuisine keywords
  if (/(?:türkisch|italienisch|chinesisch|japanisch|indisch|arabisch|deutsch|französisch|griechisch|thailändisch|vietnamesisch|mexikanisch|amerikanisch|afghanisch|pakistanisch|libanesisch|marokkanisch|äthiopisch|persisch|türk|döner|kebab|pizza|burger|sushi|curry|falafel|restaurant|essen|küche|food|cuisine)/i.test(lower)) {
    return <UtensilsCrossed className="text-primary" size={24} />;
  }

  // City/location keywords
  if (/\b(?:berlin|hamburg|münchen|köln|frankfurt|stuttgart|düsseldorf|leipzig|essen|bremen|dresden|hannover|nürnberg|stadt|ort|city|location|platz)\b/i.test(lower)) {
    return <MapPin className="text-primary" size={24} />;
  }

  // Registration keywords
  if (/\b(?:registrier|anmeld|erstellen|hinzufügen|add|create|register)/i.test(lower)) {
    return <Plus className="text-primary" size={24} />;
  }

  // Default: sparkle/generic recommendation
  return <Sparkles className="text-primary" size={24} />;
}
