# HATTRICK Elite Athletics - Design System

```yaml
name: HATTRICK Elite Athletics
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c1c'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e4e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  price-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: -0.01em
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
```

## Brand & Style

The design system is rooted in high-end minimalist streetwear aesthetics, prioritizing the "object" (the jersey) above the UI. The personality is authoritative, sharp, and premium, evoking the feeling of a luxury gallery rather than a traditional sports outlet. 

The visual style utilizes a **Minimalist** approach with a focus on extreme whitespace and high-contrast composition. Every element must feel intentional and necessary. The UI should stay "out of the way" of the photography, using precision alignment and strict monochromatic palettes to convey a sense of SaaS-level efficiency and streetwear exclusivity.

- **Primary Motif:** High-contrast blocks and razor-sharp typography.
- **Tone:** Professional, elite, and fast.
- **Vibe:** Urban luxury, editorial sports fashion.

## Colors

The palette is strictly monochromatic to ensure product colors never clash with the interface. 

- **Primary (#000000):** Used for all primary actions, headings, and critical structural elements.
- **Secondary (#FFFFFF):** The bedrock of the system. Used for page backgrounds to provide an airy, high-end feel.
- **Tertiary (#666666):** Reserved for secondary metadata, disabled states, and subtle borders.
- **WhatsApp Green (#25D366):** The only functional color allowed, used exclusively for the WhatsApp conversion entry points to ensure maximum visibility without breaking the luxury aesthetic.

Avoid all gradients. Transparency is only permitted for image overlays or search modals.

## Typography

The typography system relies on **Inter** to deliver a systematic, clean, and modern feel. Hierarchy is established through extreme weight contrast (Extra Bold for displays vs. Regular for body) and the use of uppercase labels for technical data.

- **Display Text:** Tight tracking and heavy weights for hero sections.
- **Labels:** Always uppercase with generous letter spacing to provide a technical, "product specification" feel.
- **Readability:** Body text uses a standard line height of 1.6 to maintain the airy, open feel of the brand.

## Layout & Spacing

The layout philosophy uses a **Fixed Grid** for desktop and a **Fluid Grid** for mobile. 

- **Desktop:** 12-column grid with a 1440px max-width. Columns are used to separate product imagery from detail panels. 
- **Rhythm:** An 8px base unit drives all spacing. For high-end appeal, "over-spacing" is encouraged—using `xl` or `xxl` between major sections to emphasize minimalism.
- **Mobile:** 4-column grid with 16px side margins. Product cards should ideally span 2 columns (2-up grid) or full width (1-up) for featured drops.
- **Alignment:** Strict left-alignment for all text elements to maintain a clean vertical axis.

## Elevation & Depth

This design system avoids traditional depth markers. There are no shadows.

- **Flat Hierarchy:** Depth is communicated through layering and borders rather than shadows. 
- **Low-Contrast Outlines:** Use 1px solid lines in a light gray (#E5E5E5) or black (#000000) to define sections, but only when whitespace is insufficient to create separation.
- **Surface Tiers:** All containers are #FFFFFF. Interaction states (hover) are signaled by color inversion (white text on black background) rather than lifting the element.

## Shapes

To maintain a "streetwear" and "architectural" aesthetic, the design system uses **Sharp (0px)** corners for all primary UI elements. 

- **Buttons & Inputs:** Hard 90-degree angles only.
- **Product Tiles:** Square or rectangular crops with no rounding.
- **Exceptions:** None. The sharp aesthetic is a core brand pillar, differentiating it from softer, consumer-grade e-commerce sites.

## Components

### Buttons
- **Primary:** Solid black background, white text, sharp corners. High-impact.
- **Secondary:** White background, 1px black border, black text.
- **WhatsApp Action:** Solid #25D366 background, white text, often pinned to the bottom right or placed prominently as a "Quick Buy" option.

### Input Fields
- Underline-only or 1px border. No background fill. Labels should be small, uppercase, and positioned above the field.

### Cards
- Product cards are borderless. The image should occupy 100% of the card's width. Metadata (Title, Price) is left-aligned underneath with generous padding.

### Chips/Size Selection
- Square boxes. Unselected: 1px light gray border. Selected: Solid black with white text. Out of stock: Diagonally struck through with a thin line.

### Lists
- Minimalist line-item style with 1px horizontal separators. No icons unless functional (e.g., chevron for accordion).

### Featured Component: "The Drop Timer"
- A high-contrast, large typography countdown used for new jersey releases, utilizing the `display-lg` type style.
