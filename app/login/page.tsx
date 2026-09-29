import { parseAuthError, parseAuthMessage } from "@/lib/auth-errors";
import AuthBrand, { AuthBrandMobile } from "./_components/AuthBrand";
import AuthPanel from "./_components/AuthPanel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; mode?: string }>;
}) {
  const { error, message, mode } = await searchParams;

  return (
    <div className="flex min-h-[100dvh] bg-nexa-gray dark:bg-slate-900">
      <AuthBrand />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
          <AuthBrandMobile />
          <AuthPanel
            error={parseAuthError(error)}
            message={parseAuthMessage(message)}
            initialMode={mode === "register" ? "register" : "login"}
          />
        </div>
        <p className="pb-6 text-center text-xs text-slate-400 md:hidden dark:text-slate-500">
          © {new Date().getFullYear()} Nexa Consulting TI · Uso interno
        </p>
      </main>
    </div>
  );
}
