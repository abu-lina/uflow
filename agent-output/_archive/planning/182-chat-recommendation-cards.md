---
ID: 182
Origin: 182
UUID: b4d9e1f3
Status: Active
---

# Plan: Chat Recommendation Cards

## 1. Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-17 | Planner | Initial plan from analysis 182 |

## 2. Objective

Replace plain-text recommendation rendering in chat with styled `SuggestionCard` components matching the greeting suggestion button design (icon container `w-12 h-12 rounded-[10px] bg-primary/10` + title + subtitle). This improves visual consistency and makes recommendation options feel interactive.

## 3. Summary

Three changes:
1. **New `SuggestionCard` component** — reusable card with the exact greeting button visual markup
2. **Refactor `ChatWidget`** — replace 3 hardcoded suggestion buttons with `SuggestionCard` instances
3. **Update `ChatMessage`** — when `options` exist for assistant messages, render them as `SuggestionCard` cards instead of (or supplementing) `QuickReplies` pill buttons

## 4. File-by-File Changes

### 4.1 New File: `src/features/chat/components/SuggestionCard.tsx`

Reusable button component matching greeting card design:

**Props:** `icon: ReactNode`, `title: string`, `subtitle?: string`, `onClick?: () => void`, `className?: string`

```tsx
'use client';

interface SuggestionCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}
```

Renders:
```html
<button class="flex items-center gap-4 text-left w-full" onClick={onClick}>
  <div class="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
    {icon}
  </div>
  <div class="flex-1">
    <div class="font-inter-tight text-base font-semibold text-text-primary">{title}</div>
    {subtitle && <div class="font-inter text-sm text-text-muted">{subtitle}</div>}
  </div>
</button>
```

The component applies `className` prop to the outer `<button>` for call-site flexibility.

### 4.2 Modify: `src/features/chat/components/ChatWidget.tsx`

Replace 3 hardcoded `<button>` blocks (lines 44-84) with `SuggestionCard` instances:

| Original | SuggestionCard |
|----------|---------------|
| `<button onClick={...}><div class="w-12..."><Sparkles/></div><div>...` | `<SuggestionCard icon={<Sparkles size={24} className="text-primary" />} title="Empfehlung erhalten" subtitle="Erhalte Empfehlungen" onClick={() => sendMessage('Empfiehl mir etwas')} />` |
| Same pattern with `Plus` icon | `<SuggestionCard icon={<Plus size={24} className="text-primary" />} title="Registriere Dich" subtitle="Registriere deinen Service" onClick={() => sendMessage('Ich möchte ein Restaurant registrieren')} />` |
| Same pattern with `Info` icon | `<SuggestionCard icon={<Info size={24} className="text-primary" />} title="Informationen" subtitle="Welche Kriterien wenden wir an." onClick={() => sendMessage('Welche Kriterien wendet UFlow an?')} />` |

Import `SuggestionCard` from `@/features/chat/components/SuggestionCard`.

### 4.3 Modify: `src/features/chat/components/ChatMessage.tsx`

In the assistant message rendering section (line 57-59), change the options rendering from:

```tsx
{options && onOptionSelect && role === 'assistant' && (
  <QuickReplies options={options} onSelect={onOptionSelect} disabled={isLoading} singleSelect={singleSelect} />
)}
```

To conditionally render options as `SuggestionCard` cards. Use a helper function to select an icon per option based on content keywords:

```tsx
function getOptionIcon(option: string): ReactNode {
  const lower = option.toLowerCase();
  if (/(?:\b(?:türkisch|italienisch|chinesisch|japanisch|indisch|arabisch|deutsch|französisch|griechisch|thailändisch|vietnamesisch|mexikanisch|amerikanisch|afghanisch|pakistanisch|libanesisch|marokkanisch|äthiopisch|persisch|türk|döner|kebab|pizza|burger|sushi|curry|falafel)\b)/i.test(lower)) {
    return <UtensilsCrossed size={24} className="text-primary" />;
  }
  if (/\b(?:berlin|hamburg|münchen|köln|frankfurt|stuttgart|düsseldorf|leipzig|essen|bremen|dresden|hannover|nürnberg|stadt|ort)\b/i.test(lower)) {
    return <MapPin size={24} className="text-primary" />;
  }
  if (/\b(?:registrier|anmeld|erstellen|hinzufügen)\b/i.test(lower)) {
    return <Plus size={24} className="text-primary" />;
  }
  return <Sparkles size={24} className="text-primary" />;
}
```

Render options as a grid of SuggestionCards:
```tsx
{options && onOptionSelect && role === 'assistant' && (
  <div className="flex flex-col gap-3 mt-3">
    {options.map((option, i) => (
      <SuggestionCard
        key={i}
        icon={getOptionIcon(option)}
        title={option.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}
        onClick={() => onOptionSelect(option)}
      />
    ))}
  </div>
)}
```

Keep `QuickReplies` import and usage only for multi-select mode (`singleSelect === false` and `isMultiSelect`-type scenarios). When `singleSelect` is true or options are simple suggestions, use `SuggestionCard`. This avoids breaking the existing multi-select (checkbox) behavior.

**Decision**: QuickReplies stays for multi-select flows (registration criteria selection). SuggestionCard replaces it for single-select recommendation options. The condition:

```tsx
{options && onOptionSelect && role === 'assistant' && (
  singleSelect ? (
    <div className="flex flex-col gap-3 mt-3">
      {options.map((option, i) => (
        <SuggestionCard key={i} icon={getOptionIcon(option)} title={option.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')} onClick={() => onOptionSelect(option)} />
      ))}
    </div>
  ) : (
    <QuickReplies options={options} onSelect={onOptionSelect} disabled={isLoading} singleSelect={singleSelect} />
  )
)}
```

### 4.4 New File: `src/__tests__/features/chat/SuggestionCard.test.tsx`

Tests following the project pattern (vitest + testing-library):

1. **Renders icon, title, subtitle** — verifies icon element and both text elements exist
2. **Triggers onClick** — fires handler on click
3. **No subtitle when not provided** — subtitle element is absent
4. **Applies custom className** — extra class appears on the button
5. **Renders with minimum props** — only icon + title, no crash

## 5. Data Flow

```
LLM generates response → extractOptions() parses numbered/bullet list → options: ["Türkisch", "Italienisch", ...]
  ↓
useChat receives ChatMessage { content, options, singleSelect: true }
  ↓
ChatMessage renders SuggestionCard for each option:
  ├── icon: UtensilsCrossed (content-based heuristic)
  ├── title: "Türkisch"
  ├── subtitle: not rendered
  └── onClick → onOptionSelect → sendMessage("Türkisch")
```

For greeting cards:
```
ChatWidget renders 3 SuggestionCard instances
  ├── icon: Sparkles / Plus / Info
  ├── title: "Empfehlung erhalten" / "Registriere Dich" / "Informationen"
  ├── subtitle: "Erhalte Empfehlungen" / "Registriere deinen Service" / "Welche Kriterien wenden wir an."
  └── onClick → sendMessage("Empfiehl mir etwas") etc.
```

## 6. Testing Strategy

| File | Type | Coverage |
|------|------|----------|
| `src/__tests__/features/chat/SuggestionCard.test.tsx` | Unit | Rendering, click, optional subtitle, className, edge cases |
| Existing `ChatWidget.test.tsx` | Update | Verify greeting cards render via SuggestionCard (snapshot update) |
| Existing `ChatMessage.test.tsx` | Update | Add test for options rendered as SuggestionCard cards when singleSelect=true |

### Icon heuristic test coverage

The `getOptionIcon` helper (internal to ChatMessage) should be tested implicitly through the `ChatMessage` tests:
- Food keyword → UtensilsCrossed
- City keyword → MapPin
- Registration keyword → Plus
- Unknown → Sparkles

## 7. Acceptance Criteria

1. Greeting suggestion cards render identically to current design (visual regression: none)
2. Recommendation options from LLM render as styled cards (icon container + text) instead of pill buttons
3. Clicking a SuggestionCard fires `onOptionSelect` with the correct text
4. Multi-select flows (registration criteria) continue using QuickReplies — no regression
5. All new and existing tests pass
6. `npm run type-check` passes
7. `npm run lint` passes

## 8. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Icon heuristic picks wrong icon for option text | Medium | Low | Default to Sparkles for unknown text. Heuristic is only visual — wrong icon doesn't break functionality |
| 2 | Multi-select QuickReplies broken by the split condition | Low | Medium | Keep QuickReplies as-is for `singleSelect=false`; only switch to SuggestionCard when `singleSelect=true` |
| 3 | Visual regression in greeting cards | Low | Medium | SuggestionCard uses exact same markup as current hardcoded buttons; className prop allows future overrides |
| 4 | Long option text breaks card layout | Low | Low | Card uses `flex-1` + `text-base` for title; long text wraps naturally within parent container |
