import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--ario-bg)',
        elevated: 'var(--ario-bg-elevated)',
        ink: 'var(--ario-ink)',
        soft: 'var(--ario-ink-soft)',
        muted: 'var(--ario-muted)',
        accent: 'var(--ario-accent)',
        'accent-soft': 'var(--ario-accent-soft)',
        gold: 'var(--ario-gold)',
        cyan: 'var(--ario-cyan)',
        mine: 'var(--ario-mine)',
        theirs: 'var(--ario-theirs)',
        online: 'var(--ario-online)',
        unread: 'var(--ario-unread)',
        danger: 'var(--ario-danger)',
        success: 'var(--ario-success)',
      },
      fontFamily: {
        sans: ['var(--ario-font)'],
      },
      fontSize: {
        display: 'var(--ario-text-display)',
        heading: 'var(--ario-text-heading)',
        body: 'var(--ario-text-body)',
        caption: 'var(--ario-text-caption)',
        meta: 'var(--ario-text-meta)',
        message: 'var(--ario-text-message)',
        button: 'var(--ario-text-button)',
      },
      spacing: {
        'ario-1': 'var(--ario-space-1)',
        'ario-2': 'var(--ario-space-2)',
        'ario-3': 'var(--ario-space-3)',
        'ario-4': 'var(--ario-space-4)',
        'ario-5': 'var(--ario-space-5)',
        'ario-6': 'var(--ario-space-6)',
        'ario-7': 'var(--ario-space-7)',
        'ario-8': 'var(--ario-space-8)',
      },
      borderRadius: {
        'ario-xs': 'var(--ario-radius-xs)',
        'ario-sm': 'var(--ario-radius-sm)',
        ario: 'var(--ario-radius)',
        'ario-lg': 'var(--ario-radius-lg)',
        'ario-xl': 'var(--ario-radius-xl)',
        'ario-pill': 'var(--ario-radius-pill)',
      },
      boxShadow: {
        'ario-sm': 'var(--ario-shadow-sm)',
        ario: 'var(--ario-shadow)',
        'ario-lg': 'var(--ario-shadow-lg)',
      },
      width: {
        'nav-rail': 'var(--ario-nav-rail-w)',
        'chat-list': 'var(--ario-list-w)',
      },
      minHeight: {
        touch: 'var(--ario-touch)',
        nav: 'var(--ario-nav-h)',
      },
    },
  },
  plugins: [],
};

export default config;
