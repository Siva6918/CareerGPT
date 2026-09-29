// CareerGPT - Bidirectional Scroll Animation System (Framer Motion)
// Works in BOTH Directions: Scroll Down & Scroll Up (once: false)

export const EASE_CUSTOM = [0.16, 1, 0.3, 1]; // Smooth luxury cubic-bezier

// Staggered Section Container
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05
    }
  }
};

// Main Headings (Fade in, translateY, slight scale)
export const headingMotion = {
  hidden: { opacity: 0, y: 35, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_CUSTOM }
  }
};

// Subheadings (Fade in, translateY, subtle blur-to-sharp transition)
export const subheadingMotion = {
  hidden: { opacity: 0, y: 22, filter: 'blur(5px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: 'easeOut' }
  }
};

// Body Text (Subtle fade, translateY)
export const bodyMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

// Section Labels & Badges (Fade + horizontal slide)
export const labelMotion = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: 'easeOut' }
  }
};

// Highlighted Accent Text (Subtle scale, letter-spacing feel, opacity)
export const highlightMotion = {
  hidden: { opacity: 0, scale: 0.92, letterSpacing: '0.04em' },
  visible: {
    opacity: 1,
    scale: 1,
    letterSpacing: '0.01em',
    transition: { duration: 0.6, ease: EASE_CUSTOM }
  }
};

// Cards & Interactive Modules (Slide from left)
export const cardSlideLeft = {
  hidden: { opacity: 0, x: -45, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_CUSTOM }
  }
};

// Cards & Interactive Modules (Slide from right)
export const cardSlideRight = {
  hidden: { opacity: 0, x: 45, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_CUSTOM }
  }
};

// Card Fade Up with Elevation
export const cardFadeUp = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_CUSTOM }
  }
};

// Media & Video Preview Containers (Reveal with soft zoom)
export const mediaReveal = {
  hidden: { opacity: 0, scale: 0.92, y: 30, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: EASE_CUSTOM }
  }
};

// Statistics Cards (Scale + Opacity)
export const statMotion = {
  hidden: { opacity: 0, scale: 0.88, y: 25 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_CUSTOM }
  }
};

// Standard Viewport Config for BOTH Directions (Scroll Down & Scroll Up)
export const bidirectionalViewport = {
  once: false, // Must animate both down and up, NOT only once!
  amount: 0.18 // Responsive threshold for reliable triggering
};
