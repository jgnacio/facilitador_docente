# Design System Strategy: Facilitador Docente

## 1. Overview & Creative North Star

The creative North Star for this design system is **"The Academic Architect."**

Education in Uruguay is built on a foundation of rigor and institutional trust. This system rejects the cluttered, "playful" tropes often found in EdTech in favor of a sophisticated, high-end editorial experience. It moves away from the rigid, grid-bound "app" look to feel like a high-performance workspace.

By utilizing intentional asymmetry—such as oversized headline typography paired with generous, offset white space—the UI achieves a sense of "breathing room" that mirrors the mental clarity a teacher feels when their workload is streamlined. We use layered surfaces to create a sense of focused depth, treating the interface as a physical desk where the most important pedagogical tools are always within reach but never in the way.

---

## 2. Colors: Tonal Depth & Signature Polish

The palette is anchored by the logo’s high-contrast orange and charcoal, but refined through a systematic hierarchy of Material-inspired tokens.

### The "No-Line" Rule

To achieve a premium feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through background color shifts. A section should transition from `surface` to `surface-container-low` to define a container's edge.

### Surface Hierarchy & Nesting

Treat the UI as a series of nested physical layers.

- Use `surface-container-lowest` (#ffffff) for the primary interactive cards or input areas to give them a "lift."
- Place these on a `surface-container-low` (#f3f3f7) or `surface` (#f9f9fd) base.
- This creates a natural, soft hierarchy that guides the eye without the "noisy" visual clutter of lines.

### The "Glass & Gradient" Rule

To avoid a flat, generic appearance, use **Glassmorphism** for floating elements (like sidebars or hovering toolbars). Apply a background color of `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(12px)`.

**Signature Textures:** For primary CTAs and Hero backgrounds, use a subtle linear gradient (135°) transitioning from `primary` (#9c4400) to `primary_container` (#f47d31). This adds a "soul" to the brand that flat color cannot replicate.

---

## 3. Typography: The Editorial Voice

We utilize two distinct typefaces to balance authority with readability.

* **Display & Headlines (Manrope):** A modern sans-serif with geometric foundations. Used for `display-lg` through `headline-sm`. These should be set with tight letter-spacing (-2%) to look authoritative and "fixed" on the page. Use `on_surface` (#191c1e) for maximum contrast.
* **Body & Labels (Public Sans):** An open, neutral face designed for high legibility in long-form pedagogical content. Used for `body-lg` down to `label-sm`.

**Hierarchy Strategy:**

The typography scale is intentionally aggressive. Large `display-md` headers represent the "Main Subject," while `label-md` in `on_surface_variant` (#574238) handles the "Metadata" (e.g., student names, dates). This high contrast ensures the teacher can scan a page and find the core message in milliseconds.

---

## 4. Elevation & Depth

Elevation is expressed through **Tonal Layering** rather than traditional structural dividers.

* **The Layering Principle:** Depth is achieved by stacking. A `surface-container-highest` navigation bar sits atop a `surface` background. The difference in tonal value provides all the "border" the user needs.
* **Ambient Shadows:** When a component must "float" (e.g., a modal or a floating action button), use an extra-diffused shadow: `box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06)`. Note the low opacity; we mimic natural, ambient light, not a heavy drop shadow.
* **The "Ghost Border" Fallback:** If a border is required for accessibility in complex forms, use the `outline_variant` (#dec1b3) token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons

- **Primary:** Gradient fill (`primary` to `primary_container`) with `on_primary` (#ffffff) text. Border radius set to `md` (0.375rem).
- **Secondary:** `secondary_container` (#dae3f0) background with `on_secondary_container` (#5c6570) text. No border.
- **Tertiary:** No background. Use `tertiary` (#124af0) text.

### Cards & Lists

**Forbid the use of divider lines.** Separate content using vertical white space (following a 4px/8px grid) or subtle background shifts between `surface_container_low` and `surface_container_highest`.

### Input Fields

Use `surface_container_lowest` for the field fill to make it pop against the background. Use the `outline` token (#8a7266) only as a bottom-weighted indicator or a very faint "Ghost Border."

### Specialized Component: The "Pedagogical Insight" Chip

* A custom component for the AI assistant. A selection chip using `tertiary_container` (#8197ff) with a glassmorphism blur. This signals to the teacher that the information is AI-generated and distinct from manual entries.

---

## 6. Do's and Don'ts

### Do:

- **Do** use `tertiary` blue (#124af0) sparingly to highlight "Insight" or "Pedagogical Support" features.
- **Do** favor large margins. If it feels like "too much" white space, it is likely just enough.
- **Do** use `primary_fixed_dim` (#ffb68f) for hover states on primary elements to maintain a sophisticated warmth.

### Don't:

- **Don't** use pure black (#000000). Use `on_surface` (#191c1e) for text and `inverse_surface` (#2e3133) for dark-mode-style elements.
- **Don't** use standard "drop shadows." If a shadow is visible at first glance, it is too heavy.
- **Don't** center-align long-form content. Keep pedagogical text left-aligned to the `headline` for an editorial, structured feel.
- **Don't** use dividers in lists. Use `surface_container` shifts to denote the start of a new item.

---

*This design system is a living framework intended to empower Uruguayan educators with a tool that feels as professional as their vocation.*
