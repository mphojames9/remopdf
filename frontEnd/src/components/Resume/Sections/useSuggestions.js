import { useEffect, useRef, useState } from 'react';

/*
  Runs an async suggestion lookup (onetSuggestions.js) after a short pause.

    const { data, loading } = useSuggestions(() => suggestSkills({ ... }), [dep1, dep2], {
      initial: { suggestions: [] },   // what `data` is before the first answer arrives
      enabled: open,                  // false = do nothing (e.g. the dropdown is closed)
      delay: 150,                     // ms to wait after the last change before asking
    });

  The previous answer stays on screen while the next one loads, and an answer that arrives
  after the inputs have changed again is ignored.
*/
export default function useSuggestions(load, deps, { initial, enabled = true, delay = 150 } = {}) {
  const [state, setState] = useState({ data: initial, loading: enabled });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
      return undefined;
    }
    let alive = true;
    setState((s) => (s.loading ? s : { ...s, loading: true }));
    const timer = setTimeout(() => {
      Promise.resolve(loadRef.current())
        .then((data) => {
          if (alive) setState({ data, loading: false });
        })
        .catch(() => {
          if (alive) setState((s) => ({ ...s, loading: false }));
        });
    }, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [enabled, delay, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
