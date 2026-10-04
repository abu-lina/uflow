---
ID: 182
Origin: 182
UUID: 8ebb8b61
Status: Active
---

# Analysis: Chat Recommendation Cards

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-06-17 | Analyst | Initial analysis |

## Value Statement & Objective

The LLM-generated recommendation text currently renders as plain ReactMarkdown in the chat. The user wants this feedback displayed as styled cards matching the greeting suggestion button design pattern. This improves visual consistency and makes recommendation options feel interactive rather than reading like raw text.

## Data Flow: Recommendation Request

### User: "Empfiehl mir etwas"

1. **`ChatWidget.tsx:46`** — Greeting button calls `sendMessage('Empfiehl mir etwas')`
2. **`useChat.ts:22-165`** — Sends POST to `/api/chat`, processes SSE or JSON response
3. **`route.ts:264-272`** — LLM receives system prompt with tool definitions; decides to call `search_providers`
4. **`route.ts:325-363`** — Tool executed via `executeToolCall()`, results parsed into `providerResults` (structured `ProviderCardData[]`)
5. **`route.ts:366-437`** — Follow-up LLM call streams a text response (markdown content) back via SSE
6. **`route.ts:399-401`** — `extractOptions()` parses content into option strings for QuickReplies
7. **`ChatMessage.tsx:47-49`** — Content rendered via `ReactMarkdown`
8. **`ChatMessage.tsx:50-55`** — `results` rendered as `ProviderCard` components
9. **`ChatMessage.tsx:57-59`** — `options` rendered as `QuickReplies` pill buttons

### What the user sees

```
Assistant bubble:
  [ReactMarkdown content — plain text describing recommendations]
  [ProviderCard] structured cards for each provider (if results exist)
  [QuickReplies] pill buttons for follow-up options (if extracted)
```

The "plain text recommendation feedback" is the LLM's descriptive markdown content + optionally the QuickReplies pill buttons. The user wants both replaced by (or supplemented with) styled cards matching the greeting button pattern.

## Components Analysis

### Greeting suggestion button HTML (`ChatWidget.tsx:45-56`)

```html
<button class="flex items-center gap-4 text-left">
  <div class="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
    <Sparkles class="text-primary" />
  </div>
  <div class="flex-1">
    <div class="font-inter-tight text-base font-semibold text-text-primary">Title</div>
    <div class="font-inter text-sm text-text-muted">Subtitle</div>
  </div>
</button>
```

Key visual properties:
- `gap-4` between icon and text
- Icon container: `w-12 h-12 rounded-[10px] bg-primary/10` with centered icon
- Title: `font-inter-tight text-base font-semibold text-text-primary`
- Subtitle: `font-inter text-sm text-text-muted`
- Whole thing is a `<button>` with `text-left`

### RowItem (`src/components/ui/RowItem.tsx`)

Structure: `IconListRow` wraps icon, children (title+subtitle), and optional trailing.

```html
<IconListRow className="px-2 py-2" icon={iconEl}>
  <!-- iconEl is wrapped in IconWrapper with selected-state ring/check -->
  <div>
    <p class="font-inter-tight text-base font-semibold text-text-primary">{title}</p>
    <p class="font-inter text-sm text-text-muted">{subtitle}</p>
  </div>
</IconListRow>
```

`IconListRow` layout:
```html
<div class="flex w-full items-center gap-3 rounded-xl">
  <div class="shrink-0">{icon}</div>
  <div class="min-w-0 flex-1">{children}</div>
  {trailing}
</div>
```

### Can RowItem render the exact same HTML?

**No.** Key differences:

| Property | Greeting Button | RowItem/IconListRow |
|----------|----------------|-------------------|
| Gap | `gap-4` | `gap-3` |
| Icon container | `w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center` | User-provided, but RowItem wraps in `IconWrapper` (relative + selection ring + check badge) |
| Icon sizing | `w-12 h-12` fixed | Any size, but RowItem adds `relative` wrapper |
| Button role | Always a `<button>` with `onClick` | Can be button (selectable) or static div |
| Selection UI | None | Has selected state ring + check badge |

**RowItem is not a visual match.** It was designed for multi-step form selection lists (registration flow), not for suggestion cards. Using it would:
- Add selection-state visual artifacts (ring, check badge on icon)
- Use `gap-3` instead of `gap-4` spacing
- Not have the `flex-shrink-0` on the icon area
- Not have `rounded-[10px]` on the icon container (RowItem uses `rounded-xl` = `rounded-12px`)

## What renders as "recommendation feedback"

Two distinct rendering paths in `ChatMessage.tsx`:

### Path 1: `results` (ProviderCardData → ProviderCard)
- Structured data from tool execution
- Already rendered as cards (ProviderCard component with border, badges, link)
- These are the actual provider results
- Visually distinct from the greeting button style

### Path 2: `content` + `options`
- Content is freeform LLM-generated markdown
- Options are extracted strings rendered as small pill buttons (QuickReplies)
- This is the "plain text" the user refers to

### Path 3: Fallback when no tool results
- If `search_providers` returns no results or isn't called, the response is entirely text + options

## Approaches

### Option A (Recommended): Create a reusable `SuggestionCard` component

Create `src/features/chat/components/SuggestionCard.tsx` that matches the greeting button HTML exactly:

```tsx
interface SuggestionCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}
```

- Extracts the duplicated greeting card pattern (appears 3 times in ChatWidget.tsx)
- Can be used to render recommendation options as styled cards
- Replaces QuickReplies rendering for recommendation flows
- Clean, no modification to existing components needed

**Usage plan**:
1. Replace greeting suggestion cards in `ChatWidget.tsx:44-84` with `SuggestionCard` instances
2. In `ChatMessage.tsx`, when `options` exist, render them as `SuggestionCard` buttons (instead of or in addition to QuickReplies)
3. Pass appropriate icons per recommendation context

### Option B: Modify RowItem to support icon container styling

- Add props like `iconContainerClassName`, `iconSize`, `hideSelectionUI`
- Would need to change `IconWrapper` behavior
- More invasive, risks breaking existing RowItem consumers
- Not recommended — RowItem's selection UI is core to its purpose

### Option C: Use existing RowItem as-is

- Would introduce selection visual artifacts
- Wrong gap (3 instead of 4)
- Not recommended

### Option D: Parse LLM content into structured recommendation items

- Create a service that extracts recommendation entries from LLM markdown text
- Map to `{icon, title, subtitle}[]` and render as SuggestionCards
- Fragile — LLM output format varies
- Not recommended without prompt engineering to guarantee structured output

## Recommendation

**Adopt Option A** — Create `SuggestionCard` in `src/features/chat/components/` with the exact greeting button design. This is the simplest approach that:

1. Eliminates duplicated card markup in ChatWidget.tsx (3 instances → 3 SuggestionCard uses)
2. Provides a reusable card for rendering recommendation options
3. Can replace or supplement QuickReplies rendering in ChatMessage.tsx
4. Can be extended later (e.g., add provider icon/emoji per card)

### Integration points

| File | Change |
|------|--------|
| `src/features/chat/components/SuggestionCard.tsx` | **New** — reusable card with greeting button design |
| `src/features/chat/components/ChatWidget.tsx` | Replace 3 greeting card buttons with SuggestionCard |
| `src/features/chat/components/ChatMessage.tsx` | When `options` exist for recommendations, render as SuggestionCard list instead of (or wrapping) QuickReplies |
| `src/features/chat/components/QuickReplies.tsx` | No change needed — still used for non-recommendation options |

### What SuggestionCard renders

```html
<button class="flex items-center gap-4 text-left w-full">
  <div class="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
    {icon}
  </div>
  <div class="flex-1">
    <div class="font-inter-tight text-base font-semibold text-text-primary">{title}</div>
    {subtitle && <div class="font-inter text-sm text-text-muted">{subtitle}</div>}
  </div>
</button>
```

### Future considerations

- The system prompt could be tuned to output recommendations in a more structured format (JSON with title/subtitle/icon per entry)
- `extractOptions()` could be extended to return richer data (not just strings)
- SuggestionCard could become a shared UI component if needed elsewhere
