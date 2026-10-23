---
name: validily-design-system
description: >-
  Ultra-premium, Swiss/Bauhaus-inspired academic & productivity design system.
  Includes full color tokens, typography, chronograph habit dials, circular charts,
  vertical pillar bars, luxury cards, micro-animations, and behavioral UX guidelines.
---

# VALIDILY DESIGN SYSTEM & VISUAL SPECIFICATION
### *Precision Academic Productivity & Swiss-Chronograph Visual Language*

The **Validily Design System** is an ultra-premium visual language and frontend engineering framework engineered for high-performance productivity, academic discipline, and data visualization.

It pairs **Swiss typography** and **Bauhaus functionalism** with **nautical chronograph precision** and **calm editorial luxury**.

---

## 1. DESIGN PHILOSOPHY & ART DIRECTION

1. **Precision Over Decoration**: Every border, tick mark, and radius serves information legibility. No decorative fluff or noisy gradients.
2. **Honest Data Architecture**: Never interpolate or fake user consistency. Pending occurrences are not counted as failures. Missing days remain clean and uncolored.
3. **Calm Luxury & Paper Warmth**: Surfaces use pure white (`#FFFFFF`) layered over cool tech-slate (`#F4F6FA`) with warm paper accents (`#FAFAF7`) and high-contrast charcoal ink (`#111A2E`, `#182235`).
4. **High-Contrast Chromatic Harmony**: Active routines use jewel tones (Cobalt, Emerald, Amber, Violet, Cyan) balanced against subtle slate borders (`#E4E8F0`).

---

## 2. COLOR PALETTE & DESIGN TOKENS

### Core Brand & Surface Tokens

| Token Name | Hex Code | Semantic Role | Tailwind Utility |
| :--- | :--- | :--- | :--- |
| **Ink Navy** | `#111A2E` | Primary titles, modal headers, maximum contrast ink | `text-[#111A2E]` |
| **Primary Cobalt** | `#2855D9` | Brand primary, active indicators, today's badge, primary CTAs | `bg-[#2855D9]`, `text-[#2855D9]` |
| **Secondary Blue** | `#4776F2` | Focus states, hover outlines, subtle gradients | `text-[#4776F2]` |
| **Muted Blue** | `#EDF2FF` | Active selection pill background, subtle highlight glow | `bg-[#EDF2FF]` |
| **Cool Slate Background** | `#F4F6FA` | App root background, toolbar segment containers | `bg-[#F4F6FA]` |
| **Pure White** | `#FFFFFF` | Primary card surface, central hubs, input backgrounds | `bg-white` |
| **Warm White** | `#FAFAF7` | Hover states, future calendar cells, empty state fill | `bg-[#FAFAF7]` |
| **Primary Slate** | `#182235` | Body copy, prominent metric numbers | `text-[#182235]` |
| **Secondary Slate** | `#68748A` | Muted labels, eyebrows, subtitles, units | `text-[#68748A]` |
| **Border Neutral** | `#E4E8F0` | Default card borders, divider lines, tick marks | `border-[#E4E8F0]` |
| **Border Subdued** | `#CBD5E1` | Interactive borders on hover, secondary ticks | `border-[#CBD5E1]` |

### Semantic Status Colors

* **Emerald (Success / Validé)**: `#059669` (Fill), `#ECFDF5` (Bg), `#A7F3D0` (Border)
* **Amber (Warning / Attention / Streak)**: `#D97706` (Fill), `#FEF3C7` (Bg), `#FDE68A` (Border)
* **Cobalt (Action / Pending / À faire)**: `#2855D9` (Fill), `#EDF2FF` (Bg), `#BFDBFE` (Border)
* **Rose / Crimson (Error / Failure)**: `#DC2626` (Fill), `#FEF2F2` (Bg), `#FECACA` (Border)
* **Slate (Missed / Non validé)**: `#94A3B8` (Fill), `#F8FAFC` (Bg), `#E2E8F0` (Border)

### 12-Color Harmonic Jewel Ring Palette (for Multi-Habit Wheels)

When rendering concentric rings or multi-series charts, cycle through this sequence:

```typescript
export const RING_PALETTES = [
  { name: "Cobalt",   fill: "#2855D9", bg: "#EDF2FF", light: "#93C5FD" },
  { name: "Émeraude", fill: "#059669", bg: "#ECFDF5", light: "#A7F3D0" },
  { name: "Ambre",    fill: "#D97706", bg: "#FEF3C7", light: "#FDE68A" },
  { name: "Violet",   fill: "#7C3AED", bg: "#F5F3FF", light: "#DDD6FE" },
  { name: "Rose",     fill: "#E11D48", bg: "#FFF1F2", light: "#FECDD3" },
  { name: "Cyan",     fill: "#0284C7", bg: "#F0F9FF", light: "#BAE6FD" },
  { name: "Indigo",   fill: "#4F46E5", bg: "#EEF2FF", light: "#C7D2FE" },
  { name: "Sarcelle", fill: "#0D9488", bg: "#F0FDFA", light: "#99F6E4" },
  { name: "Corail",   fill: "#EA580C", bg: "#FFF7ED", light: "#FED7AA" },
  { name: "Fuchsia",  fill: "#C026D3", bg: "#FDF4FF", light: "#F5D0FE" },
  { name: "Lime",     fill: "#65A30D", bg: "#F7FEE7", light: "#D9F99D" },
  { name: "Ardoise",  fill: "#475569", bg: "#F8FAFC", light: "#CBD5E1" },
];
```

---

## 3. TYPOGRAPHY & INFORMATION HIERARCHY

### Font Stack & Features
* **Primary Sans**: System UI / Inter / Plus Jakarta Sans (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
* **Monospace & Numbers**: JetBrains Mono, SF Mono, Menlo, monospace (`font-mono`).
* **Numeric Feature Settings**: Always enable `font-variant-numeric: tabular-nums` or `tnum` on analytics counters so digits do not jump when ticking.

### Hierarchy Matrix

```html
<!-- 1. Eyebrow Tag -->
<div class="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#68748A]">
  <Sparkles class="w-3.5 h-3.5 text-[#2855D9]" />
  <span>Discipline & Constance</span>
</div>

<!-- 2. Master Page Heading -->
<h1 class="text-2xl font-bold text-[#111A2E] tracking-tight mt-1">
  Habitudes & Routine
</h1>

<!-- 3. Section Title -->
<h3 class="text-base font-bold text-[#111A2E] tracking-tight">
  Roue Circulaire des Habitudes
</h3>

<!-- 4. Metric Value -->
<span class="text-2xl font-bold font-mono tracking-tight text-[#111A2E]">
  84%
</span>

<!-- 5. Editorial Subtitle / Explanatory Text -->
<p class="text-xs text-[#68748A] leading-relaxed">
  Inspiré des carnets de discipline circulaire. Chaque rayon correspond à un jour, chaque anneau à une routine.
</p>
```

---

## 4. RADIAL POLAR HABIT WHEEL (CHRONOGRAPH SVG SPECIFICATION)

The centerpiece of Validily is the **Circular Polar Habit Dial**, inspired by Swiss chronographs and circular bullet journals.

```
                    [ 24 ] (Aujourd'hui - Badge Cobalt)
                 23        25
              22              26
            21                  27
          20                      28
         19                        29
         18      +------------+     30
        17       |  OCTOBRE   |      1
        16       |    2026    |      2
        15       | 84% const. |      3
         14      +------------+     4
          13                       5
            12                    6
              11                7
                 10          8
                     [ 9 ]
```

### Mathematical Geometry & SVG Formulas

```typescript
// 1. Polar to Cartesian Coordinate Mapping
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleInRadians: number
): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

// 2. Annular Sector Path Generator (Rings of cells)
export function describeAnnularSector(
  cx: number,
  cy: number,
  r0: number, // Inner radius
  r1: number, // Outer radius
  a0: number, // Start angle (radians)
  a1: number  // End angle (radians)
): string {
  const p0 = polarToCartesian(cx, cy, r1, a0);
  const p1 = polarToCartesian(cx, cy, r1, a1);
  const p2 = polarToCartesian(cx, cy, r0, a1);
  const p3 = polarToCartesian(cx, cy, r0, a0);

  const largeArcFlag = a1 - a0 <= Math.PI ? "0" : "1";

  return [
    `M ${p0.x} ${p0.y}`,
    `A ${r1} ${r1} 0 ${largeArcFlag} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${r0} ${r0} 0 ${largeArcFlag} 0 ${p3.x} ${p3.y}`,
    "Z",
  ].join(" ");
}
```

### SVG Dimensions & Parameters
* **SVG ViewBox**: `0 0 540 540`
* **Center**: `cx = 270`, `cy = 270`
* **Outer Ring Radius**: `outerRadius = 210`
* **Hub Core Radius**: `hubRadius = numRings <= 4 ? 78 : numRings <= 6 ? 66 : 56`
* **Ring Width**: `ringWidth = (outerRadius - hubRadius) / numRings`
* **Annular Angular Gap**: `angularGap = 0.015` (creates clean white gaps between radial sectors)
* **Circumference Tick Marks**:
  * Inner tick radius: `outerRadius + 4` (214)
  * Outer tick radius: `outerRadius + 11` (221)
  * Stroke: `#CBD5E1` (`1px` width; `#2855D9` `2px` on today)
* **Circumference Day Numbers**:
  * Marker radius: `outerRadius + 26` (236)
  * Font sizing:
    * `7 days`: `14px` bold
    * `15 days`: `13px` bold
    * `30/31 days`: `11.5px` weight 700
    * `50 days`: `10px` weight 700
  * Standard color: `#1E293B` (rich charcoal slate)
  * Future days: `#94A3B8`
  * Today's Date Badge:
    * Circle behind number: `r = 11` (or 13 if <=15d), `fill="#2855D9"`
    * Number text: `fill="#FFFFFF"` bold
* **Central Hub Core**:
  * White background (`#FFFFFF`), `stroke="#E4E8F0"`, `strokeWidth="2"`
  * Category tag: `text-[9px] font-bold uppercase tracking-widest text-[#64748B]`
  * Month & Year: `text-[12.5px] font-bold text-[#0F172A]`
  * Regularity Score: `text-[10.5px] font-bold text-[#059669] font-mono`

---

## 5. MONTH-BY-MONTH TRACEABILITY & PERIOD FILTERS

### Period Filters Standard: `7 j`, `15 j`, `30 j`, `50 j`
* **Remove 90-day filter**: 90 rays around 360 degrees produce 4-degree slivers that are unreadable.
* **Keep strictly**:
  * `7 j`: 1-week tactical sprint (extra large numbers).
  * `15 j`: Bi-weekly / half-month block.
  * `30 j`: Standard calendar month (renders exact days 1 to 28/30/31 of active month).
  * `50 j`: 7-week macro-horizon.

### Month Navigation Toolbar Component

```tsx
<div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0] text-xs">
  <button
    type="button"
    onClick={handlePrevMonth}
    className="p-1.5 text-[#68748A] hover:text-[#111A2E] hover:bg-white rounded-lg transition-colors cursor-pointer"
    title="Mois précédent"
  >
    <ChevronLeft className="w-3.5 h-3.5" />
  </button>

  <div className="flex items-center gap-1.5 px-2 font-bold text-[#111A2E] text-xs">
    <Calendar className="w-3.5 h-3.5 text-[#2855D9]" />
    <span>{currentMonthLabel}</span>
    {isCurrentMonth ? (
      <span className="text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] px-1.5 py-0.2 rounded-full border border-[#A7F3D0]">
        Actuel
      </span>
    ) : (
      <span className="text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] px-1.5 py-0.2 rounded-full border border-[#FDE68A]">
        Archive
      </span>
    )}
  </div>

  <button
    type="button"
    onClick={handleNextMonth}
    disabled={isCurrentMonth}
    className={`p-1.5 rounded-lg transition-colors ${
      isCurrentMonth
        ? "text-[#CBD5E1] cursor-not-allowed"
        : "text-[#68748A] hover:text-[#111A2E] hover:bg-white cursor-pointer"
    }`}
    title="Mois suivant"
  >
    <ChevronRight className="w-3.5 h-3.5" />
  </button>
</div>
```

---

## 6. WEEKDAY CONSISTENCY PILLARS ("Profil de Régularité Hebdomadaire")

A clean, modern alternative to noisy line charts. 7 vertical capsule pillars representing Monday through Sunday.

```tsx
<div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <div>
      <h3 className="text-sm font-bold text-[#111A2E] tracking-tight">
        Profil de Régularité Hebdomadaire
      </h3>
      <p className="text-xs text-[#68748A] mt-0.5">
        Distribution fine des taux de succès du Lundi au Dimanche.
      </p>
    </div>
    {strongestDay && (
      <span className="text-[11px] font-mono font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
        ★ Point fort : {strongestDay.fullName} ({strongestDay.rate}%)
      </span>
    )}
  </div>

  <div className="grid grid-cols-7 gap-2 pt-2">
    {WEEKDAY_ITEMS.map((item) => (
      <div key={item.index} className="flex flex-col items-center gap-2">
        <div className="w-full max-w-[28px] h-28 bg-[#F1F5F9] rounded-full p-0.5 flex flex-col justify-end overflow-hidden">
          <div
            className={`w-full rounded-full transition-all duration-500 ${
              item.isStrongest ? "bg-[#059669]" : "bg-[#2855D9]"
            }`}
            style={{ height: `${Math.max(item.rate, 4)}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-[#182235]">{item.label}</span>
        <span className="text-[10px] font-mono text-[#68748A]">{item.rate}%</span>
      </div>
    ))}
  </div>
</div>
```

---

## 7. CARDS, SURFACES & SEGMENTED CONTROLS

### Luxury Card Formula
```html
<div class="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 shadow-xs">
  <!-- Card Content -->
</div>
```

### Segmented Toolbar Pill Container
```html
<div class="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0] text-xs font-semibold">
  <!-- Active Button -->
  <button class="bg-white text-[#2855D9] shadow-xs font-bold px-3 py-1.5 rounded-lg transition-all">
    Option A
  </button>
  <!-- Inactive Button -->
  <button class="text-[#68748A] hover:text-[#182235] px-3 py-1.5 rounded-lg transition-colors">
    Option B
  </button>
</div>
```

---

## 8. TACTILE CHECKMARK & HALO MICRO-ANIMATIONS

Add to your project's `globals.css`:

```css
@keyframes checkmark-pop {
  0% { transform: scale(0.3) rotate(-12deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(4deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes task-halo {
  0% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.6); }
  60% { box-shadow: 0 0 0 7px rgba(5, 150, 105, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
}

.animate-check-pop {
  animation: checkmark-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-task-halo {
  animation: task-halo 0.45s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. ICONOGRAPHY STANDARDS

Use **Lucide React** (`lucide-react`) exclusively with consistent stroke widths and scales:

* **Sizing Rules**:
  * Eyebrow & Badges: `w-3.5 h-3.5`
  * Action Buttons & Links: `w-4 h-4`
  * Card Header Feature: `w-5 h-5`
  * Empty States: `w-10 h-10 text-[#68748A]`
* **Core Semantic Icon Mapping**:
  * Academics / Study: `BookOpen`, `Brain`, `GraduationCap`
  * Discipline & Streaks: `Flame` (`text-[#D97706] fill-current`)
  * Health / Vitality: `Heart`, `Activity`
  * Time & Focus: `Clock`, `Target`, `Zap`
  * Calendar & Chronology: `Calendar`, `RotateCcw`, `Sparkles`
  * Modes & Layouts: `CircleDot`, `LayoutGrid`, `Layers`

---

## 10. CHECKLIST BEFORE SHIPPING ANY UI IN THIS STYLE

- [ ] Is the primary text Ink Navy (`#111A2E`) or Charcoal Slate (`#182235`), avoiding low-contrast grey?
- [ ] Are numbers using `font-mono font-bold font-tabular`?
- [ ] Are cards styled with `bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl shadow-xs`?
- [ ] Are active buttons using Cobalt `#2855D9` with `#EDF2FF` soft accents?
- [ ] Does the circular dial have precision circumference tick marks and clear `11.5px`+ numbers?
- [ ] Is today highlighted with a Cobalt circle badge and crisp white text?
- [ ] Are the period filters restricted to `7j`, `15j`, `30j`, `50j` (no unreadable `90j`)?
- [ ] Can users navigate backwards into previous months to inspect past performance?
- [ ] Are all micro-animations disabled under `prefers-reduced-motion: reduce`?
