import { useEffect } from 'react';

/**
 * Runtime debugger for validateDOMNesting: <button> inside <button>.
 * Attach to any component's root ref. Scans the DOM subtree for nested buttons
 * and logs the full ancestor chain + component stack.
 *
 * Usage:
 *   const ref = useDetectNestedButtons('CourierDetail');
 *   return <div ref={ref}>...</div>
 *
 * Remove after diagnosis is complete.
 */
export function useDetectNestedButtons(label: string) {
  useEffect(() => {
    // Scan entire document body for nested buttons
    const allButtons = document.querySelectorAll('button');
    const violations: { inner: Element; outer: Element; path: string }[] = [];

    allButtons.forEach(btn => {
      let parent = btn.parentElement;
      while (parent) {
        if (parent.tagName === 'BUTTON') {
          // Build path
          const path: string[] = [];
          let el: Element | null = btn;
          while (el && el !== document.body) {
            const tag = el.tagName.toLowerCase();
            const cls = el.className
              ? `.${(typeof el.className === 'string' ? el.className : '')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join('.')}`
              : '';
            const dataSlot = el.getAttribute('data-slot');
            const slot = dataSlot ? `[data-slot="${dataSlot}"]` : '';
            path.unshift(`${tag}${slot}${cls.slice(0, 60)}`);
            el = el.parentElement;
          }

          violations.push({
            inner: btn,
            outer: parent,
            path: path.join(' > '),
          });
          break;
        }
        parent = parent.parentElement;
      }
    });

    if (violations.length > 0) {
      console.group(
        `%c🔴 [${label}] Found ${violations.length} nested <button> violation(s)`,
        'color: red; font-weight: bold; font-size: 14px'
      );
      violations.forEach((v, i) => {
        console.groupCollapsed(`Violation #${i + 1}`);
        console.log('Inner button:', v.inner);
        console.log('Outer button:', v.outer);
        console.log('DOM path:', v.path);
        console.log('Inner HTML (outer):', v.outer.innerHTML.slice(0, 500));
        console.groupEnd();
      });
      console.groupEnd();
    } else {
      console.log(
        `%c✅ [${label}] No nested <button> violations found (scanned ${allButtons.length} buttons)`,
        'color: green; font-weight: bold'
      );
    }
  });
}
