import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import './trigger.css';

const GameDialog = lazy(() => import('./LightsOutDialog'));

/** Homepage supplies the artwork; this boundary owns discovery and lazy loading. */
export function LightsOutEasterEgg({ children }: { children: (press: () => void) => ReactNode }) {
  const [clicks, setClicks] = useState(0);
  const [discovered, setDiscovered] = useState(false);
  const [open, setOpen] = useState(false);
  const timestamps = useRef<number[]>([]);
  useEffect(() => {
    if (!clicks) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      timestamps.current = timestamps.current.filter(time => now - time < 4000);
      setClicks(timestamps.current.length);
    }, Math.max(0, timestamps.current[0] + 4000 - Date.now()));
    return () => clearTimeout(timer);
  }, [clicks]);

  const press = () => {
    const now = Date.now();
    timestamps.current = [...timestamps.current.filter(time => now - time < 4000), now];
    const next = timestamps.current.length;
    if (next >= 5) {
      timestamps.current = [];
      setClicks(0);
      setDiscovered(true);
      setOpen(true);
    } else setClicks(next);
  };

  return (
    <>
      {children(press)}
      <span className="lo-discovery" role="status">{clicks >= 3 ? `有一点好奇心……再点 ${5 - clicks} 下。` : ''}</span>
      {discovered && (
        <Suspense fallback={<span className="lo-discovery" role="status">正在打开秘密工坊…</span>}>
          <GameDialog open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
