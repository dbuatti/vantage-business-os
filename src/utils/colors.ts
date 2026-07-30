export const semanticColors = {
  profit: {
    text: 'text-profit',
    bg: 'bg-profit-bg',
    border: 'border-profit-border',
    solid: 'bg-profit text-profit-foreground',
    dot: 'bg-profit',
  },
  danger: {
    text: 'text-danger',
    bg: 'bg-danger-bg',
    border: 'border-danger-border',
    solid: 'bg-danger text-danger-foreground',
    dot: 'bg-danger',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    solid: 'bg-warning text-warning-foreground',
    dot: 'bg-warning',
  },
  info: {
    text: 'text-info',
    bg: 'bg-info-bg',
    border: 'border-info-border',
    solid: 'bg-info text-info-foreground',
    dot: 'bg-info',
  },
  ai: {
    text: 'text-ai',
    bg: 'bg-ai-bg',
    border: 'border-ai-border',
    solid: 'bg-ai text-ai-foreground',
    dot: 'bg-ai',
  },
} as const;

export type SemanticColor = keyof typeof semanticColors;

export function badgeClasses(type: SemanticColor): string {
  const c = semanticColors[type];
  return `${c.bg} ${c.text} ${c.border} text-[10px] font-bold uppercase tracking-tight px-2.5 py-1 rounded-lg border`;
}
