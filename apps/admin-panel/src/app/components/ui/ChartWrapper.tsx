import { useState, useRef, useEffect, type ReactElement } from 'react';

interface ChartWrapperProps {
  height: number;
  children: (width: number, height: number) => ReactElement;
  className?: string;
}

/**
 * Measures the container and passes explicit pixel dimensions to
 * the Recharts chart via a render-prop.  The chart is only rendered
 * once the container has a valid (>0) width, which avoids the
 * Recharts "width(-1) height(-1)" error.
 *
 * Usage:
 *   <ChartWrapper height={300}>
 *     {(w, h) => (
 *       <LineChart width={w} height={h} data={data}>…</LineChart>
 *     )}
 *   </ChartWrapper>
 */
export function ChartWrapper({ height, children, className = '' }: ChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    };

    // wait one frame so the element is laid-out
    const raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height, minWidth: 0, overflow: 'hidden' }}
    >
      {width > 0 ? children(width, height) : null}
    </div>
  );
}
