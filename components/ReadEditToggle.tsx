"use client";

import { useState } from "react";

// Wraps a read-only summary + its edit form (both rendered server-side and
// passed in as children) so a profile section can default to a quiet
// key/value view and only show the form once the person asks to edit it.
export default function ReadEditToggle({
  readView,
  editView,
  editLabel = "Editar",
}: {
  readView: React.ReactNode;
  editView: React.ReactNode;
  editLabel?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div>
        {editView}
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          Cancelar edición
        </button>
      </div>
    );
  }

  return (
    <div>
      {readView}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-4 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40"
      >
        {editLabel}
      </button>
    </div>
  );
}
