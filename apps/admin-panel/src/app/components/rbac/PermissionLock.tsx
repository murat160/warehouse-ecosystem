/**
 * PermissionLock + usePerm — small RBAC primitives for the admin panel.
 *
 *  - usePerm(perm) → boolean. Reactive against AuthContext.
 *  - <Locked perm="..."> wraps a button/link. When the user has the
 *    permission, children are rendered as-is. When they don't, children
 *    are rendered disabled with a small lock badge + tooltip.
 *  - <ShowIf perm="...">      → conditionally renders only if allowed.
 *  - <HiddenIfMissing perm>   → like ShowIf but renders a small "locked"
 *                               placeholder box for layouts that need it.
 *
 * The components are intentionally minimal — pages stay in control of
 * styling. They just clone the child element and add `disabled` / a
 * Lock icon when access is denied.
 */
import { ReactElement, ReactNode, cloneElement, isValidElement } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/** Hook: returns true when the current user has `perm` (or wildcard). */
export function usePerm(perm: string | undefined): boolean {
  const { hasPermission } = useAuth();
  if (!perm) return true;
  return hasPermission(perm);
}

interface LockedProps {
  perm: string;
  /** Tooltip shown when blocked. */
  reason?: string;
  /** Render the locked variant inline (default) or hidden. */
  fallback?: 'disabled' | 'hidden';
  children: ReactElement;
}

/**
 * Wraps an interactive element. If the user lacks `perm`:
 *  - in `disabled` mode (default): clones the child with disabled=true,
 *    a strikethrough opacity, a `title=` tooltip, and a tiny Lock icon
 *    floating top-right of the rendered child.
 *  - in `hidden` mode: renders nothing.
 */
export function Locked({ perm, reason, fallback = 'disabled', children }: LockedProps) {
  const allowed = usePerm(perm);
  if (allowed) return children;
  if (fallback === 'hidden') return null;

  if (!isValidElement(children)) return null;

  const tip = reason ?? `Нет права: ${perm}`;
  const childProps = (children.props ?? {}) as Record<string, unknown>;
  const cloned = cloneElement(children as ReactElement<any>, {
    disabled: true,
    onClick: (e: any) => { e.preventDefault?.(); e.stopPropagation?.(); },
    title: tip,
    'aria-disabled': true,
    className: `${(childProps.className as string) ?? ''} opacity-50 cursor-not-allowed`,
  });

  return (
    <span className="relative inline-flex" title={tip}>
      {cloned}
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center pointer-events-none">
        <Lock className="w-2.5 h-2.5" />
      </span>
    </span>
  );
}

interface ShowIfProps {
  perm: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Conditional render. Mounts children only if user has `perm`. */
export function ShowIf({ perm, children, fallback = null }: ShowIfProps) {
  const allowed = usePerm(perm);
  return <>{allowed ? children : fallback}</>;
}
