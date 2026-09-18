"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "./Toast";

// Bridges the existing redirect(`?success=...&error=...`) convention used by
// every server action in this app into a toast, then strips those two keys
// from the URL (keeping any other query params, e.g. dashboard's ?q=&status=)
// so refreshing or going back doesn't re-fire the same message.
export default function FlashToast({ success, error }: { success?: string; error?: string }) {
  const { push } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!success && !error) return;
    fired.current = true;
    if (success) push(success, "success");
    if (error) push(error, "error");

    const params = new URLSearchParams(window.location.search);
    params.delete("success");
    params.delete("error");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [success, error, push, router, pathname]);

  return null;
}
