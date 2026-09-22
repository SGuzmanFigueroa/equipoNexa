"use client";

import Menu from "./Menu";
import ConfirmSubmitButton from "./ConfirmSubmitButton";

// The "..." menu on each project card needs a render-prop child (so it can
// pass `close` down) — that only works as a Client Component composing its
// own children. Passed in from a Server Component (the projects page),
// a plain function as `children` isn't serializable across the RSC
// boundary ("Functions are not valid as a child of Client Components"),
// so this wrapper exists to keep that composition entirely on the client.
export default function ProjectCardMenu({
  projectId,
  projectName,
  deleteProject,
}: {
  projectId: string;
  projectName: string;
  deleteProject: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Menu
      align="right"
      trigger={
        <button
          type="button"
          aria-label="Más opciones"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          •••
        </button>
      }
    >
      {() => (
        <form action={deleteProject}>
          <input type="hidden" name="id" value={projectId} />
          <ConfirmSubmitButton
            confirmMessage={`¿Eliminar el proyecto "${projectName}"? Esto también borra sus asignaciones de integrantes y, como esta tabla es compartida, cualquier ticket del Gestor de Tickets que pertenezca a este proyecto. No se puede deshacer.`}
            className="flex w-full items-center px-3 py-1.5 text-left text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Eliminar proyecto
          </ConfirmSubmitButton>
        </form>
      )}
    </Menu>
  );
}
