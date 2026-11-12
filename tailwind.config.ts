import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        primary: ['var(--font-primary)'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
        },
        accent: {
          red: 'var(--color-accent-red)',
          'red-hover': 'var(--color-accent-red-hover)',
          gold: 'var(--color-accent-gold)',
        },
        surface: {
          body: 'var(--bg-body)',
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          dark: 'var(--bg-dark)',
          disabled: 'var(--bg-disabled)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          disabled: 'var(--text-disabled)',
        },
        line: {
          light: 'var(--border-light)',
          DEFAULT: 'var(--border-default)',
          focus: 'var(--border-focus)',
          error: 'var(--border-error)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          error: 'var(--status-error)',
        },
      },
      fontSize: {
        xs: 'var(--fs-xs)',
        sm: 'var(--fs-sm)',
        base: 'var(--fs-base)',
        md: 'var(--fs-md)',
        lg: 'var(--fs-lg)',
        xl: 'var(--fs-xl)',
        '2xl': 'var(--fs-2xl)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        btn: 'var(--radius-btn)',
        input: 'var(--radius-input)',
        card: 'var(--radius-card)',
        modal: 'var(--radius-modal)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        header: 'var(--shadow-header)',
        dropdown: 'var(--shadow-dropdown)',
        modal: 'var(--shadow-modal)',
      },
      letterSpacing: {
        wide: 'var(--tracking-wide)',
        wider: 'var(--tracking-wider)',
      },
      maxWidth: {
        container: 'var(--container-max-width)',
      },
      height: {
        topbar: 'var(--topbar-height)',
        header: 'var(--header-height)',
        btn: 'var(--btn-height)',
        'btn-lg': 'var(--btn-height-lg)',
        input: 'var(--input-height)',
      },
    },
  },
  plugins: [],
};

export default config;
