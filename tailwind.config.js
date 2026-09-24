/**
 * Tailwind CSS Configuration for SeeTheSpecs
 * ==========================================
 *
 * This config extends Tailwind with custom design tokens that align with the
 * seethespecs design system, carried over unchanged. See src/lib/styles/design-tokens.css for the
 * complete token reference.
 *
 * Design Philosophy: "Precision + Durability"
 * - Industrial/mechanical aesthetic inspired by CAD tools, motorsport dashboards
 * - Strong contrast, restrained steel blue accent
 * - Minimal border radii for crisp edges
 * - Both light and dark modes share the same semantic token structure
 *
 * @type {import('tailwindcss').Config}
 */
import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{html,svelte,js,ts}'],

  // DaisyUI handles theme switching via data-theme attribute
  darkMode: ['selector', '[data-theme="dark"]'],

  theme: {
    extend: {
      /**
       * COLOR PALETTE
       * =============
       * Uses semantic tokens that automatically adapt to light/dark mode.
       * Primitives (slate, steel, safety) are in design-tokens.css
       */
      colors: {
        // Semantic background colors
        background: {
          DEFAULT: 'var(--background)',
          muted: 'var(--background-muted)'
        },
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
          sunken: 'var(--surface-sunken)',
          overlay: 'var(--surface-overlay)'
        },
        // Semantic text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-disabled': 'var(--text-disabled)',
        'text-inverse': 'var(--text-inverse)',
        'text-link': 'var(--text-link)',
        // Semantic border colors
        border: {
          DEFAULT: 'var(--border)',
          muted: 'var(--border-muted)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)'
        },
        divider: 'var(--divider)',
        // Primary accent (Steel Blue)
        primary: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          active: 'var(--accent-primary-active)',
          muted: 'var(--accent-primary-muted)',
          text: 'var(--accent-primary-text)'
        },
        // Secondary accent (Safety Orange - sparse use)
        secondary: {
          DEFAULT: 'var(--accent-secondary)',
          hover: 'var(--accent-secondary-hover)',
          muted: 'var(--accent-secondary-muted)',
          text: 'var(--accent-secondary-text)'
        },
        // Status colors
        success: {
          DEFAULT: 'var(--status-success)',
          bg: 'var(--status-success-bg)',
          text: 'var(--status-success-text)'
        },
        warning: {
          DEFAULT: 'var(--status-warning)',
          bg: 'var(--status-warning-bg)',
          text: 'var(--status-warning-text)'
        },
        danger: {
          DEFAULT: 'var(--status-danger)',
          bg: 'var(--status-danger-bg)',
          text: 'var(--status-danger-text)'
        },
        info: {
          DEFAULT: 'var(--status-info)',
          bg: 'var(--status-info-bg)',
          text: 'var(--status-info-text)'
        },
        // Form elements
        input: {
          bg: 'var(--input-bg)',
          border: 'var(--input-border)',
          text: 'var(--input-text)',
          placeholder: 'var(--input-placeholder)'
        },
        // Navigation
        nav: {
          bg: 'var(--nav-bg)',
          text: 'var(--nav-text)',
          active: 'var(--nav-text-active)',
          hover: 'var(--nav-hover-bg)'
        },
        // Sidebar (admin)
        sidebar: {
          bg: 'var(--sidebar-bg)',
          text: 'var(--sidebar-text)',
          muted: 'var(--sidebar-text-muted)',
          hover: 'var(--sidebar-hover-bg)',
          active: 'var(--sidebar-active-bg)',
          border: 'var(--sidebar-border)'
        }
      },

      /**
       * TYPOGRAPHY
       * ==========
       * System font stack with monospace for specs/data
       */
      fontFamily: {
        sans: 'var(--font-family-base)',
        heading: 'var(--font-family-heading)',
        mono: 'var(--font-family-mono)'
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-snug)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-none)' }],
        '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-none)' }]
      },

      /**
       * BORDER RADIUS
       * =============
       * Minimal radii for industrial/mechanical aesthetic
       * Crisp edges with slight softening
       */
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-default)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)'
      },

      /**
       * SHADOWS
       * =======
       * Subtle, realistic shadows for machined depth
       */
      boxShadow: {
        none: 'var(--shadow-none)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-default)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        inset: 'var(--shadow-inset)',
        focus: 'var(--shadow-focus)'
      },

      /**
       * TRANSITIONS
       * ===========
       */
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '150ms',
        slow: '300ms'
      },

      /**
       * Z-INDEX
       * =======
       */
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)'
      },

      /**
       * MAX-WIDTH (Containers)
       * ======================
       */
      maxWidth: {
        narrow: 'var(--content-narrow)',
        content: 'var(--content-default)',
        wide: 'var(--content-wide)',
        full: 'var(--content-full)'
      }
    }
  },

  plugins: [daisyui],

  daisyui: {
    themes: [
      {
        // Light theme - industrial, technical, precise
        light: {
          primary: '#bf8942', // Bronze
          'primary-content': '#ffffff',
          secondary: '#f97316', // Safety orange (sparse use)
          'secondary-content': '#ffffff',
          accent: '#d9a76a', // Lighter bronze
          'accent-content': '#3d2813',
          neutral: '#bf8942', // Bronze 500 (gold/bronze)
          'neutral-content': '#ffffff', // White text on bronze
          'base-100': '#ffffff', // Surface
          'base-200': '#fdf8f3', // Background (bronze 50)
          'base-300': '#f9efe3', // Background muted (bronze 100)
          'base-content': '#3d2813', // Text primary (bronze 950)
          info: '#2563eb',
          'info-content': '#ffffff',
          success: '#16a34a',
          'success-content': '#ffffff',
          warning: '#eab308',
          'warning-content': '#ffffff',
          error: '#dc2626',
          'error-content': '#ffffff',
          // Custom properties for border radius
          '--rounded-box': '4px',
          '--rounded-btn': '4px',
          '--rounded-badge': '2px',
          '--animation-btn': '0.15s',
          '--animation-input': '0.15s',
          '--btn-focus-scale': '0.98',
          '--border-btn': '1px',
          '--tab-border': '1px',
          '--tab-radius': '4px'
        }
      },
      {
        // Dark theme - pure black with bronze accents
        dark: {
          primary: '#d9a76a', // Bronze 400 (lighter for dark bg)
          'primary-content': '#000000',
          secondary: '#f97316', // Safety orange
          'secondary-content': '#ffffff',
          accent: '#bf8942', // Bronze 500
          'accent-content': '#000000',
          neutral: '#a67436', // Bronze 600 (slightly darker for dark mode)
          'neutral-content': '#ffffff', // White text
          'base-100': '#141414', // Surface (dark gray)
          'base-200': '#000000', // Background (pure black)
          'base-300': '#0a0a0a', // Background muted
          'base-content': '#f5f5f5', // Text primary
          info: '#3b82f6',
          'info-content': '#ffffff',
          success: '#22c55e',
          'success-content': '#ffffff',
          warning: '#eab308',
          'warning-content': '#ffffff',
          error: '#ef4444',
          'error-content': '#ffffff',
          // Same border radius as light
          '--rounded-box': '4px',
          '--rounded-btn': '4px',
          '--rounded-badge': '2px',
          '--animation-btn': '0.15s',
          '--animation-input': '0.15s',
          '--btn-focus-scale': '0.98',
          '--border-btn': '1px',
          '--tab-border': '1px',
          '--tab-radius': '4px'
        }
      }
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    logs: false
  }
};
