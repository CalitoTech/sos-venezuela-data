"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useRef, useEffect } from "react";

const DEBOUNCE_MS = 350;

export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending navigation on unmount so a debounced replace can't fire
  // after the component is gone.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);

    // Debounce the server round-trip: navigate only once the user pauses
    // typing, instead of firing a query on every keystroke.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(() => {
        const url = v.trim() ? `/?q=${encodeURIComponent(v.trim())}` : "/";
        router.replace(url, { scroll: false });
      });
    }, DEBOUNCE_MS);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Buscar por nombre, cédula o lugar..."
        style={{
          width: "100%",
          background: "var(--bg-input)",
          border: "1px solid var(--border-hi)",
          borderRadius: 3,
          color: "var(--text)",
          fontFamily: "var(--mono)",
          fontSize: "0.9rem",
          padding: "0.75rem 1rem 0.75rem 2.8rem",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--red)")}
        onBlur={e => (e.target.style.borderColor = "var(--border-hi)")}
      />
      <span style={{
        position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)",
        color: pending ? "var(--amber)" : "var(--text-faint)",
        fontSize: "0.9rem", pointerEvents: "none", transition: "color 0.2s",
      }}>
        {pending ? "⟳" : "⌕"}
      </span>
    </div>
  );
}
