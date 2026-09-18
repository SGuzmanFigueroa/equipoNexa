"use client";

import { useEffect, useState } from "react";

export default function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  useEffect(() => {
    // Lets external links like /members/123#disponibilidad land straight
    // on the right tab instead of always opening on the first one.
    const hash = window.location.hash.slice(1);
    if (hash && tabs.some((t) => t.id === hash)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div
        role="tablist"
        className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-nexa-blue text-nexa-blue"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}
