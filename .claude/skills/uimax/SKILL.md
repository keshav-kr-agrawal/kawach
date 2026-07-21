---
name: uimax
description: Rules for award-level premium frontend interfaces, featuring custom typography, dual-color systems, rigid layout principles, and story-first motion design.
---

# UIMAX: Award-Level Frontend & UI Design System Rules

This skill defines the visual, structural, and behavioral standards required to build premium, immersive, and "award-level" user interfaces. Follow these constraints strictly when designing or implementing web projects.

## 1. Anti‑slop, Anti‑generic Baseline
- **No AI Clichés:** Never use "AI", "assistant", "copilot" or similar buzzwords in UI copy unless the product genuinely needs it for clarity, and even then keep it minimal and concrete.
- **Custom/Bespoke Icons:** Avoid off‑the‑shelf icon packs that are obviously recognizable (e.g. Lucide, generic outline sets). If icons are needed, customize them or build a small bespoke set derived from the brand’s shapes.
- **Differentiated Typography:** Never use default/generic fonts like system sans, standard Google "startup" fonts, or anything that instantly feels template‑like. Visual identity must start at typography.
- **Extreme Spacing Intent:** Every visual choice must be intentional. No random spacing, no random font sizes, and no "because Tailwind suggested it" decisions.

## 2. Typography and Font Effects
- **Uncommon Typefaces:** Use unique or uncommon typefaces. Combine 2–3 maximum per site so it feels designed, not chaotic.
- **Hybrid Typography:** Hybrid typography is highly encouraged: a single line or phrase can mix serif, sans, and cursive as long as the semantic grouping is clear (e.g. main noun in one font, adjective in another).
- **Controlled Text Effects:** Font effects are allowed but must stay controlled: different weights per phrase, subtle glow on cursive words, slight highlight for important terms. Avoid meme-level text effects.
- **Purposeful Hierarchy:** Each usage of small vs large font must be purposeful (e.g. small for technical labels, huge for emotional headlines). Size shifts should reflect hierarchy and storytelling, not randomness.
- **Responsive Text:** Responsive text is required. Scale heading and body sizes with breakpoints so typography feels balanced on both mobile and desktop.

## 3. Color System and Tailwind Design Tokens
- **Design System First:** Before building, define a design system: Tailwind theme tokens for colors, spacing, radii, shadows, and typography (no raw hex values scattered through classes).
- **Strict 2‑Color Rule:**
  - **Base:** Near‑white (not gray) background tint.
  - **Accent:** A single pastel color that works on near‑white (no neon, no heavy saturation).
- **Dual-Hue Domination:** These 2 colors must drive everything: buttons, sections, cards, highlights, shadows, and text accents are all variants of them (lighter/darker tints, alpha changes, or subtle gradients). No more than these 2 base hues are allowed. Any "third" appearance must be a neutral (e.g. pure black or white for text) rather than a new chromatic color.
- **Semantic Classes over Inline Hex:** Use Tailwind variants and tokens instead of inline hex (e.g. `bg-brand`, `text-accent`, `shadow-accent-soft`) wired to the design system so you never fall back to random `bg-[#xxxxxx]`.

## 4. Layout, Spacing, and Responsiveness
- **Flawless Execution:** Every margin, gap, and padding must be intentional. No overlapping, no unplanned cropping, no accidental whitespace.
- **Layout Primitives:** Use layout primitives (stacks, grids, centers) rather than ad‑hoc flex spaghetti. For example, use horizontal/vertical stacks with `gap-*` on parents instead of margins on children.
- **Full Responsiveness:** Responsiveness is non‑negotiable. Design for mobile, tablet, and desktop with clear breakpoint rules. Stack/column switches must be defined, not "whatever happens".
- **Story-Guided Layouts:** Avoid generic layout patterns like "just center everything with giant cards." Each section should have a distinct composition that supports the story (left/right split, editorial layout, staggered blocks, etc.).
- **Consistent Rhythm:** There must be a visible aesthetic pattern across the page. Maintain a consistent rhythm of section heights, recurring shapes, and repeated micro‑motifs (lines, dots, small flourishes) to avoid a "random blocks" feel.

## 5. Viewport Sections and Motion Libraries
- **Story Beats:** Prefer full‑height viewport sections (`min-h-[100vh]` / `min-h-screen`) for major story beats: hero, key narrative segments, product explanation, and closing pitch.
- **Fluid Scrolling:** Smooth scroll is required. Use a professional implementation (Lenis or GSAP ScrollSmoother) aligned with ScrollTrigger so animations stay in sync and accessible.
- **Subtle, Professional Motion:** Use GSAP, ScrollTrigger, Framer Motion, and similar libraries in a subtle, deliberate, professional way:
  - No constant bouncing.
  - Controlled entrances and reveals.
  - Timelines tuned to feel cinematic but clean.
- **No Custom Cursors:** Custom cursor is generally not allowed; default cursor keeps focus on content and clarity.
- **Scroll-Tied Interaction:** For scroll interactions, favor pinned sections, parallax layers, and text reveals that are directly tied to the story the site is telling.

## 6. Story‑First Content and Structure
- **Narrative Arc:** Treat the website as a narrative, not a list of features: define the story arc (hook → tension → depth → resolution → conversion) before designing sections.
- **Exceptional Structure:** Generic content must be reformatted into an exceptional structure: nested components, clear hierarchies, editorial treatments (pull quotes, subhead stories, supporting microcopy).
- **Narrative-Driven Components:** Component design follows the story, not the other way around: card groups, timelines, comparison tables, or scrollytelling sequences should exist only when they serve a narrative beat.
- **Award-Style Hero:** The hero section must be catchy and award‑styled:
  - Strong typography hierarchy.
  - Intense but controlled animations (text reveals, blurs, transforms).
  - A clear story in one glance: who this is for and what transformation it offers.
- **Crafted Formatting:** Content formatting is part of the skill: headings, subtitles, longform blocks, and microcopy are structured and spaced in a way that feels crafted, not auto‑generated.

## 7. Motion Style: "Award‑Level" Hero and Sections
- **High-Quality Motion:** Use high‑quality motion: text reveal on scroll, layered blurs, depth via transforms, and timeline‑based sequences rather than quick one‑off fades.
- **Purposeful Animation:** Animations must be intentional. Every effect has a reason (emphasize a phrase, guide attention to a key action, communicate product personality).
- **Rich but Controlled:** Avoid both minimalism and chaos: the target is "rich but controlled" – like modern motion portfolios and GSAP masterclass examples, not template animations.
- **Performance & Accessibility:** Respect performance and accessibility:
  - Watch ScrollTrigger start/end ranges.
  - Use markers and debugging to avoid mis‑aligned triggers.
  - Support reduced‑motion preferences gracefully.
- **Bespoke Asset Concepting:** When you need complex assets (e.g. 300‑frame scroll video, image sequences), you explicitly define the concept and timing, then source/produce accordingly instead of settling for generic stock.
