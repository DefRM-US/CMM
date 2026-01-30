# DefRM Design System

A comprehensive design system for React + Tailwind CSS applications with a defence-themed aesthetic.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Tailwind Configuration](#tailwind-configuration)
5. [Global CSS](#global-css)
6. [Component Patterns](#component-patterns)
7. [Defence-Themed Effects (Optional)](#defence-themed-effects-optional)
8. [Accessibility](#accessibility)
9. [Mobile Utilities](#mobile-utilities)

---

## Quick Start

### Required Dependencies

```bash
npm install tailwindcss postcss autoprefixer tailwindcss-animate class-variance-authority clsx tailwind-merge
```

### Font Loading (index.html)

Add to `<head>`:

```html
<!-- Preconnect to Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Primary: Geist -->
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet" />

<!-- Fallback: Poppins -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />

<!-- Monospace: IBM Plex Mono -->
<link
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>

<!-- Serif: Playfair Display -->
<link
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Mobile Viewport Meta

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover"
/>
```

---

## Color System

### Why OKLCH?

OKLCH is a perceptually uniform color space that ensures:

- Consistent contrast across themes
- Predictable color relationships
- Better accessibility compliance
- Smoother gradients and transitions

Format: `oklch(Lightness Chroma Hue)`

- **L (Lightness)**: 0 (black) to 1 (white)
- **C (Chroma)**: Color intensity (0 = grayscale)
- **H (Hue)**: Color angle in degrees (0-360)

### Dark Theme (Default)

Applied to `:root` - active when no `.light` class on `<html>`.

| Token                      | Value                           | Description    |
| -------------------------- | ------------------------------- | -------------- |
| `--background`             | `oklch(0 0 0)`                  | Pure black     |
| `--foreground`             | `oklch(0.9850 0 0)`             | Near white     |
| `--card`                   | `oklch(0.2050 0 0)`             | Dark gray      |
| `--card-foreground`        | `oklch(0.9850 0 0)`             | Near white     |
| `--popover`                | `oklch(0.4748 0 0)`             | Medium gray    |
| `--popover-foreground`     | `oklch(0.9850 0 0)`             | Near white     |
| `--primary`                | `oklch(0.9123 0.0319 78.1524)`  | Emerald green  |
| `--primary-foreground`     | `oklch(0 0 0)`                  | Black          |
| `--secondary`              | `oklch(0.2966 0.0730 17.6562)`  | Dark orange    |
| `--secondary-foreground`   | `oklch(0.9477 0.0107 100.8264)` | Light yellow   |
| `--muted`                  | `oklch(0.3094 0.0208 13.5358)`  | Muted brown    |
| `--muted-foreground`       | `oklch(0.7000 0 0)`             | Medium gray    |
| `--accent`                 | `oklch(0.2914 0.0135 10.3760)`  | Dark accent    |
| `--accent-foreground`      | `oklch(0.9850 0 0)`             | Near white     |
| `--destructive`            | `oklch(0.7469 0.0034 17.2344)`  | Red/orange     |
| `--destructive-foreground` | `oklch(1.0000 0 0)`             | White          |
| `--border`                 | `oklch(0.1149 0 0)`             | Very dark gray |
| `--input`                  | `oklch(0.2500 0 0)`             | Dark gray      |
| `--ring`                   | `oklch(0.2673 0.0680 137.1690)` | Teal (focus)   |

### Light Theme

Applied when `.light` class is on `<html>`.

| Token                      | Value                           | Description      |
| -------------------------- | ------------------------------- | ---------------- |
| `--background`             | `oklch(1 0 0)`                  | Pure white       |
| `--foreground`             | `oklch(0.1450 0 0)`             | Very dark gray   |
| `--card`                   | `oklch(1 0 0)`                  | Pure white       |
| `--card-foreground`        | `oklch(0.1450 0 0)`             | Very dark gray   |
| `--popover`                | `oklch(0.3581 0.0407 19.2601)`  | Medium brown     |
| `--popover-foreground`     | `oklch(0.1450 0 0)`             | Very dark gray   |
| `--primary`                | `oklch(0.3495 0.0966 136.2978)` | Dark teal        |
| `--primary-foreground`     | `oklch(0.9314 0.0539 100.4648)` | Light yellow     |
| `--secondary`              | `oklch(0.9112 0.0320 73.5148)`  | Light green      |
| `--secondary-foreground`   | `oklch(0 0 0)`                  | Black            |
| `--muted`                  | `oklch(0.9677 0.0158 73.6821)`  | Very light green |
| `--muted-foreground`       | `oklch(0.0969 0 0)`             | Near black       |
| `--accent`                 | `oklch(0.9158 0 0)`             | Light gray       |
| `--accent-foreground`      | `oklch(0.2050 0 0)`             | Dark gray        |
| `--destructive`            | `oklch(0.5528 0.1118 21.3448)`  | Orange-red       |
| `--destructive-foreground` | `oklch(1.0000 0 0)`             | White            |
| `--border`                 | `oklch(0.9220 0 0)`             | Light gray       |
| `--input`                  | `oklch(0.9220 0 0)`             | Light gray       |
| `--ring`                   | `oklch(0.8962 0.0310 72.1513)`  | Light green      |

### Chart Colors (Data Visualization)

**Dark Theme:**
| Token | Value |
|-------|-------|
| `--chart-1` | `oklch(0.2701 0.0807 19.0956)` |
| `--chart-2` | `oklch(0.4386 0 0)` |
| `--chart-3` | `oklch(0.3454 0.0407 133.0378)` |
| `--chart-4` | `oklch(0.9123 0.0319 78.1524)` |
| `--chart-5` | `oklch(0.4962 0.0440 10.7176)` |

**Light Theme:**
| Token | Value |
|-------|-------|
| `--chart-1` | `oklch(0.3799 0.1145 19.0256)` |
| `--chart-2` | `oklch(0.7986 0.0090 17.3460)` |
| `--chart-3` | `oklch(0.3495 0.0966 136.2978)` |
| `--chart-4` | `oklch(0.7506 0.0328 133.3785)` |
| `--chart-5` | `oklch(0.9801 0.0172 99.5949)` |

### Sidebar Tokens

**Dark Theme:**
| Token | Value |
|-------|-------|
| `--sidebar-background` | `oklch(0.2050 0 0)` |
| `--sidebar-foreground` | `oklch(0.9850 0 0)` |
| `--sidebar-primary` | `oklch(0.3249 0.0926 136.3036)` |
| `--sidebar-primary-foreground` | `oklch(0.9850 0 0)` |
| `--sidebar-accent` | `oklch(0.2690 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.9850 0 0)` |
| `--sidebar-border` | `oklch(0.2750 0 0)` |
| `--sidebar-ring` | `oklch(0.4390 0 0)` |

**Light Theme:**
| Token | Value |
|-------|-------|
| `--sidebar-background` | `oklch(0.9850 0 0)` |
| `--sidebar-foreground` | `oklch(0.1450 0 0)` |
| `--sidebar-primary` | `oklch(0.2050 0 0)` |
| `--sidebar-primary-foreground` | `oklch(0.9850 0 0)` |
| `--sidebar-accent` | `oklch(0.8507 0.0033 17.2230)` |
| `--sidebar-accent-foreground` | `oklch(0.2050 0 0)` |
| `--sidebar-border` | `oklch(0.9220 0 0)` |
| `--sidebar-ring` | `oklch(0.7080 0 0)` |

---

## Typography

### Font Families

```css
--font-sans: Geist, Poppins, ui-sans-serif, sans-serif, system-ui;
--font-serif: Playfair Display, ui-serif, serif;
--font-mono: IBM Plex Mono, ui-monospace, monospace;
```

### Usage

| Font             | Class        | Use Case                         |
| ---------------- | ------------ | -------------------------------- |
| Geist            | `font-sans`  | Body text, UI elements (default) |
| Poppins          | (fallback)   | Automatic fallback for Geist     |
| IBM Plex Mono    | `font-mono`  | Code, technical data, metrics    |
| Playfair Display | `font-serif` | Editorial content, headings      |

### Weight Guidelines

| Weight | Class           | Use Case                     |
| ------ | --------------- | ---------------------------- |
| 400    | `font-normal`   | Body text, descriptions      |
| 500    | `font-medium`   | Subheadings, emphasized text |
| 600    | `font-semibold` | Badges, labels, buttons      |
| 700    | `font-bold`     | Headings, titles             |

### Examples

```tsx
// Default body text (Geist)
<p className="font-sans">Regular text</p>

// Code/technical content (IBM Plex Mono)
<code className="font-mono text-sm bg-muted px-2 py-1 rounded">npm install</code>

// Editorial heading (Playfair Display)
<h1 className="font-serif text-4xl font-bold">Mission Brief</h1>

// Technical readout
<span className="font-mono text-xs text-muted-foreground">SYS_STATUS: OPERATIONAL</span>
```

---

## Tailwind Configuration

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) + 2px)',
        sm: 'calc(var(--radius) + 4px)',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar-background)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## Global CSS

### index.css Structure

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Dark Theme (Default) */
  :root {
    /* Color Tokens - see Color System section */
    --background: oklch(0 0 0);
    --foreground: oklch(0.985 0 0);
    /* ... all tokens ... */

    /* Typography Tokens */
    --font-sans: Geist, Poppins, ui-sans-serif, sans-serif, system-ui;
    --font-serif: Playfair Display, ui-serif, serif;
    --font-mono: IBM Plex Mono, ui-monospace, monospace;

    /* Spacing and Radius */
    --radius: 0rem;
    --spacing: 0.27rem;
  }

  /* Light Theme */
  .light {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    /* ... all light tokens ... */
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans;
  }
}
```

### Theme Switching

```typescript
// Toggle light theme
document.documentElement.classList.add('light');

// Toggle dark theme (default)
document.documentElement.classList.remove('light');

// Check current theme
const isLight = document.documentElement.classList.contains('light');
```

---

## Component Patterns

### Glassmorphic Cards

The signature DefRM card style uses backdrop blur with semi-transparent backgrounds:

```tsx
// Base glassmorphic card
<div className="rounded-xl border text-card-foreground shadow-sm transition-all duration-300 bg-card/80 backdrop-blur-md border-border/60 hover:scale-[1.02] hover:shadow-md">
  {/* content */}
</div>

// Enhanced glass effect
<div className="bg-card/60 backdrop-blur-lg border-border/50">
  {/* content */}
</div>
```

**Key Classes:**

- `backdrop-blur-md` - Medium blur (12px)
- `backdrop-blur-lg` - Large blur (16px) for enhanced effect
- `bg-card/80` - 80% opacity card background
- `border-border/60` - 60% opacity border
- `hover:scale-[1.02]` - Subtle hover lift
- `rounded-xl` - Large border radius

### Button Variants

```tsx
// Primary button with shimmer effect
<button className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 relative overflow-hidden focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
  <span className="relative z-10">Deploy</span>
  {/* Shimmer overlay */}
  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] hover:translate-x-[200%] transition-transform duration-[600ms]" />
</button>

// Outline variant
<button className="border border-input bg-transparent shadow-sm hover:bg-primary/5 hover:text-accent-foreground">
  Secondary Action
</button>

// Ghost variant
<button className="hover:bg-accent hover:text-accent-foreground">
  Ghost
</button>
```

**Button Sizes:**
| Size | Classes |
|------|---------|
| Default | `h-9 px-4 py-2` |
| Small | `h-8 rounded-md px-3 text-xs` |
| Large | `h-10 rounded-md px-6` |
| Icon | `h-9 w-9` |

### Focus States

All interactive elements should use visible focus rings:

```tsx
// Standard focus state
className = 'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

// Enhanced focus with shadow
className = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
```

### Opacity Modifiers

Use Tailwind opacity modifiers for layered depth:

```tsx
// Backgrounds
bg - card / 80; // 80% opacity
bg - card / 60; // 60% opacity (more glass-like)
bg - primary / 10; // 10% opacity (subtle tint)
bg - primary / 5; // 5% opacity (very subtle)

// Borders
border - border / 60; // 60% opacity
border - primary / 40; // 40% opacity

// Text
text - muted - foreground; // Muted text color
```

### Transition Patterns

```tsx
// Standard transition
className = 'transition-all duration-200';

// Card hover transition
className = 'transition-all duration-300 hover:scale-[1.02] hover:shadow-md';

// Color-only transition
className = 'transition-colors duration-200';

// Transform transition
className = 'transition-transform duration-200 hover:translate-x-0.5';
```

### Badge Styling

```tsx
<span className="inline-flex items-center rounded-md border px-2.5 py-0.5 uppercase text-xs font-semibold transition-colors border-primary/40 bg-primary/15 text-foreground">
  Active
</span>
```

---

## Defence-Themed Effects (Optional)

These effects create the signature DefRM aesthetic. They are entirely optional and can impact performance on lower-end devices.

### Grid Pulse Animation

A pulsating grid overlay effect for backgrounds:

```css
@keyframes grid-pulse {
  0%,
  100% {
    opacity: 0.03;
  }
  50% {
    opacity: 0.08;
  }
}

.grid-overlay {
  animation: grid-pulse 4s ease-in-out infinite;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### Scanline Animation

A vertical sweep overlay:

```css
@keyframes scanline {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100vh);
  }
}

.scanline {
  animation: scanline 8s linear infinite;
  background: linear-gradient(180deg, transparent 0%, var(--primary) 50%, transparent 100%);
  height: 100px;
  opacity: 0.1;
}
```

### Aurora Glow Animation

Radial gradient highlight with movement:

```css
@keyframes aurora {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.4;
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
    opacity: 0.6;
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
    opacity: 0.5;
  }
}

.aurora-glow {
  animation: aurora 6s ease-in-out infinite;
  background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
  filter: blur(60px);
}
```

### Shimmer Effect (Buttons)

```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}
```

### Utility Animations

```css
/* Count up - for metrics */
@keyframes count-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fade in up - for cards */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide in left - for sidebars */
@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* General fade */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

### Effect Implementation Notes

1. **Position behind content**: Use `z-index: -10` and `position: fixed/absolute`
2. **Don't block interactions**: Always add `pointer-events: none`
3. **Hide from screen readers**: Add `aria-hidden="true"`
4. **Consider performance**: Disable on mobile or low-end devices
5. **Respect user preferences**: Check `prefers-reduced-motion`

```tsx
// Example effect container
<div className="fixed inset-0 pointer-events-none" style={{ zIndex: -10 }} aria-hidden="true">
  {/* Effect content */}
</div>
```

---

## Accessibility

### Focus Indicators

```css
/* Enhanced focus visibility */
.focus-visible:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--ring) 20%, transparent);
}
```

### Touch Targets

Minimum 44x44px for all interactive elements:

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

### Reduced Motion Support

All animations automatically respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  .high-contrast {
    border: 2px solid;
    background: var(--background);
    color: var(--foreground);
  }

  .high-contrast-button {
    border: 2px solid var(--foreground);
    background: var(--background);
    color: var(--foreground);
  }

  .high-contrast-button:hover {
    background: var(--foreground);
    color: var(--background);
  }
}
```

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 0.375rem;
  z-index: 9999;
}
```

---

## Mobile Utilities

### Responsive Text Sizing

```css
.responsive-text-sm {
  @apply text-sm sm:text-base;
}
.responsive-text-base {
  @apply text-base sm:text-lg;
}
.responsive-text-lg {
  @apply text-lg sm:text-xl;
}
.responsive-text-xl {
  @apply text-xl sm:text-2xl;
}
```

### Mobile-Safe Areas

```css
.mobile-safe-area {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### iOS Zoom Prevention

Prevent zoom on input focus:

```css
@media screen and (max-width: 768px) {
  input[type='text'],
  input[type='email'],
  input[type='password'],
  input[type='number'],
  input[type='tel'],
  input[type='url'],
  input[type='search'],
  textarea,
  select {
    font-size: 16px !important;
  }
}
```

### Mobile Spacing Utilities

```css
/* Card spacing */
.mobile-card-spacing {
  @apply p-3 sm:p-4 md:p-6;
}

/* Form spacing */
.mobile-form-spacing {
  @apply space-y-4 sm:space-y-6;
}

/* Button sizing */
.mobile-button {
  @apply min-h-[44px] px-4 py-2 text-base;
}

/* Grid layouts */
.mobile-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4;
}
.mobile-grid-2 {
  @apply grid grid-cols-1 sm:grid-cols-2 gap-4;
}
```

### Touch Feedback

```css
.touch-feedback {
  @apply active:scale-95 active:bg-accent/20 transition-transform duration-75;
}
```

### Scrolling

```css
.smooth-scroll {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.touch-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## Utility Function: cn()

For merging Tailwind classes safely:

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Usage:

```tsx
import { cn } from '@/lib/utils';

<div className={cn('base-classes', condition && 'conditional-classes', className)} />;
```

---

## Quick Reference

### Essential Classes

| Purpose           | Classes                                                          |
| ----------------- | ---------------------------------------------------------------- |
| Glassmorphic card | `bg-card/80 backdrop-blur-md border-border/60 rounded-xl`        |
| Primary button    | `bg-primary text-primary-foreground hover:bg-primary/90`         |
| Focus ring        | `focus-visible:ring-[3px] focus-visible:ring-ring/50`            |
| Muted text        | `text-muted-foreground`                                          |
| Subtle border     | `border border-border/60`                                        |
| Hover lift        | `hover:scale-[1.02] hover:shadow-md transition-all duration-300` |
| Touch target      | `min-h-[44px] min-w-[44px]`                                      |

### Color Token Usage

```tsx
// Backgrounds
bg - background; // Main background
bg - card; // Card surfaces
bg - primary; // Primary actions
bg - muted; // Subtle backgrounds

// Text
text - foreground; // Primary text
text - muted - foreground; // Secondary text
text - primary; // Accent text

// Borders
border - border; // Default borders
border - input; // Form inputs

// Focus
ring - ring; // Focus rings
```

---

_DefRM Design System v1.0_
