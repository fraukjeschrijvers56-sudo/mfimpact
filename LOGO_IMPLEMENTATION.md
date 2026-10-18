# MF Impact Logo Implementation

Commit: `e6108eb71d60e9d783c02aae34c122eebda44fb8`

## Logo Assets Created

All assets processed from `uploads/mfimpact-logo.png` (2172x724) using sharp:

### Public Assets
- **`public/logo-full.png`** (1954x347) - Full logo with original colors (teal MF mark + dark green wordmark), transparent background
- **`public/logo-full-white.png`** (1954x347) - White version for dark backgrounds (teal mark + white wordmark)
- **`public/logo-mark.png`** - Just the MF mark (square-ish), extracted from left portion

### Favicon Assets
- **`app/icon.png`** (512x512) - Next.js app icon
- **`app/apple-icon.png`** (512x512) - Apple touch icon
- **`public/favicon.ico`** - Browser favicon
- **`public/favicon-32x32.png`** - Standard favicon
- **`public/favicon-16x16.png`** - Small favicon

## Implementation

### 1. Top Navigation (`app/components/TopMenu.tsx`)
```tsx
<img src="/logo-full-white.png" alt="MF Impact" className="h-9 w-auto" />
```
- White logo version on dark emerald-950/95 background
- Kept "MVO-bewijs werkbank" as small bordered side label
- Height: 36px (h-9)

### 2. Login Page (`app/login/page.tsx`)
```tsx
<img src="/logo-full-white.png" alt="MF Impact" className="h-20 w-auto" />
```
- Prominent logo above login form
- Height: 80px (h-20)
- Animated entrance with Framer Motion

### 3. Intake Home Page (`app/page.tsx`)
```tsx
<img src="/logo-full-white.png" alt="MF Impact" className="h-12 w-auto opacity-80" />
```
- Subtle branding at top of page
- Height: 48px (h-12)
- 80% opacity for subtlety

### 4. Metadata (`app/layout.tsx`)
- **Title:** "MF Impact – MVO-bewijs werkbank"
- **Description:** "AI-gedreven MVO-bewijs en ESG-analyse voor het Nederlandse MKB..."
- **OpenGraph image:** `/logo-full.png` (1954x347)
- **metadataBase:** Production URL for proper image resolution

## Design Consistency

✅ Dark-green glass theme maintained throughout  
✅ High contrast white text preserved  
✅ Logo readable on all dark emerald backgrounds  
✅ Consistent spacing and sizing  
✅ Professional branding without overwhelming the UI  

## Browser Support

- Modern browsers: SVG-quality PNG assets
- Favicons: Multiple sizes for all devices
- Apple devices: Dedicated touch icon
- OpenGraph: Social media preview images

---

**Processing Script:** `scripts/process-logo.mjs`  
**Technology:** Sharp (high-performance image processing)  
**Build Status:** ✓ Passed (npm run build)
