import { type SemanticColor, badgeClasses, semanticColors } from '@/utils/colors';
import { cn } from '@/lib/utils';

interface SemanticBadgeProps {
  type: SemanticColor;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function SemanticBadge({ type, children, className, dot }: SemanticBadgeProps) {
  return (
    <span className={cn(badgeClasses(type), 'inline-flex items-center gap-1.5', className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', semanticColors[type].dot)} />}
      {children}
    </span>
  );
}
