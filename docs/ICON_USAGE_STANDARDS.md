# Icon Usage Standards - Lucide Icons

## 🎯 Icon Library

**Use:** [Lucide React](https://lucide.dev/) for ALL icons

**Don't use:** Emojis, FontAwesome, Material Icons, or other libraries

---

## 📏 Icon Sizes (Tailwind Classes)

### Standard Sizes

| Size | Class | Pixels | Use Case |
|------|-------|--------|----------|
| **XS** | `w-icon-xs h-icon-xs` | 16px | Inline with text, small badges |
| **SM** | `w-icon-sm h-icon-sm` | 20px | Buttons, form inputs, tags |
| **MD** | `w-icon-md h-icon-md` | 24px | Default icon size, navigation |
| **LG** | `w-icon-lg h-icon-lg` | 32px | Headers, featured items |
| **XL** | `w-icon-xl h-icon-xl` | 48px | Feature highlights, empty states |
| **2XL** | `w-icon-2xl h-icon-2xl` | 64px | Success/error states, hero sections |
| **3XL** | `w-icon-3xl h-icon-3xl` | 96px | Major success/confirmation pages |

### Legacy Sizes (still supported)
- `w-4 h-4` = 16px (use `w-icon-xs h-icon-xs` instead)
- `w-5 h-5` = 20px (use `w-icon-sm h-icon-sm` instead)
- `w-6 h-6` = 24px (use `w-icon-md h-icon-md` instead)

---

## 🎨 Icon Colors

### Semantic Colors

```tsx
// Success (green)
<CheckCircle className="w-icon-2xl h-icon-2xl text-success" />

// Error (red)
<XCircle className="w-icon-2xl h-icon-2xl text-danger" />

// Warning (orange)
<AlertTriangle className="w-icon-xl h-icon-xl text-warning" />

// Info (blue)
<Info className="w-icon-lg h-icon-lg text-info" />

// Primary (mint)
<Check className="w-icon-md h-icon-md text-mint" />
```

### Context Colors

```tsx
// Content text (gray)
<Mail className="w-icon-md h-icon-md text-content" />

// Title/heading
<User className="w-icon-lg h-icon-lg text-content-title" />

// Muted/secondary
<Clock className="w-icon-sm h-icon-sm text-grey" />
```

---

## 📦 Common Icon Replacements

### Signup/Auth Flow

| Old Emoji | New Lucide Icon | Size | Usage |
|-----------|----------------|------|-------|
| 📧 | `<Mail />` | 3XL | Check email page |
| ✅ | `<CheckCircle />` or `<CheckCircle2 />` | 3XL | Email confirmed |
| ❌ | `<XCircle />` | 2XL | Error states |
| ⚠️ | `<AlertTriangle />` | LG | Warning messages |
| ℹ️ | `<Info />` | SM | Info boxes |
| 🔄 | `<RefreshCw />` | MD | Loading/refresh |

### Actions

| Old Emoji | New Lucide Icon | Size | Usage |
|-----------|----------------|------|-------|
| 👁️ | `<Eye />` / `<EyeOff />` | SM | Password visibility |
| ➕ | `<Plus />` | MD | Add actions |
| ✏️ | `<Edit />` / `<Pencil />` | SM | Edit actions |
| 🗑️ | `<Trash2 />` | SM | Delete actions |
| ⭐ | `<Star />` | SM | Favorites |
| 💾 | `<Save />` | SM | Save actions |

### Navigation

| Old Emoji | New Lucide Icon | Size | Usage |
|-----------|----------------|------|-------|
| 🏠 | `<Home />` | MD | Home |
| 👤 | `<User />` | MD | Profile |
| ⚙️ | `<Settings />` | MD | Settings |
| 🔍 | `<Search />` | MD | Search |
| ← | `<ArrowLeft />` | MD | Back |
| → | `<ArrowRight />` | MD | Forward |

---

## 💻 Code Examples

### Basic Usage

```tsx
import { Mail, CheckCircle, AlertTriangle } from 'lucide-react';

// Check email page
<Mail className="w-icon-3xl h-icon-3xl text-info" />

// Success page
<CheckCircle className="w-icon-3xl h-icon-3xl text-success" />

// Warning alert
<AlertTriangle className="w-icon-lg h-icon-lg text-warning" />
```

### With Animation

```tsx
import { CheckCircle } from 'lucide-react';

<CheckCircle 
  className="w-icon-3xl h-icon-3xl text-success animate-scale-in"
/>
```

### Inline with Text

```tsx
import { Info } from 'lucide-react';

<div className="flex items-center gap-2">
  <Info className="w-icon-xs h-icon-xs text-info" />
  <span>This is an info message</span>
</div>
```

### Button Icons

```tsx
import { Save } from 'lucide-react';

<button className="flex items-center gap-2">
  <Save className="w-icon-sm h-icon-sm" />
  <span>Save</span>
</button>
```

### Loading States

```tsx
import { Loader2 } from 'lucide-react';

<Loader2 className="w-icon-md h-icon-md text-mint animate-spin" />
```

---

## 🚫 What NOT to Do

```tsx
// ❌ Don't use emojis
<div>📧</div>

// ❌ Don't use arbitrary sizes
<Mail className="w-[45px] h-[45px]" />

// ❌ Don't mix icon libraries
<FaCheck /> // FontAwesome - NO!

// ❌ Don't use inline styles for sizes
<Mail style={{ width: '48px' }} />

// ✅ DO use standardized classes
<Mail className="w-icon-xl h-icon-xl text-info" />
```

---

## 🎨 Icon Components to Update

### Priority 1 (Signup Flow)
- [x] `/auth/check-email` - Replace 📧 with `<Mail />`
- [x] `/auth/confirm` - Replace ✅ with `<CheckCircle />`
- [ ] `/auth/confirm` - Replace ❌ with `<XCircle />` (error state)
- [ ] `EmailVerificationAlert.tsx` - Replace any emojis

### Priority 2 (Common Components)
- Review all components in `src/components/` for emoji usage
- Replace with appropriate Lucide icons

### Priority 3 (Feature Pages)
- Review `src/app/` pages for emoji usage
- Standardize all icons to Lucide

---

## 📚 Lucide Resources

- **Browse Icons:** https://lucide.dev/icons
- **React Docs:** https://lucide.dev/guide/packages/lucide-react
- **GitHub:** https://github.com/lucide-icons/lucide

---

## 🔧 Migration Checklist

When updating a component with emojis:

1. [ ] Find the emoji in the code
2. [ ] Choose appropriate Lucide replacement from table above
3. [ ] Import the icon: `import { IconName } from 'lucide-react'`
4. [ ] Use standardized size class
5. [ ] Use semantic color class
6. [ ] Test on mobile viewport
7. [ ] Remove emoji

---

_Last updated: October 17, 2025_
_Standard applies to all new code - existing icons in navbar/buttons preserved_


