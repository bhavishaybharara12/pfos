"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RedirectHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/family");
  }, [router]);
  return (
    <div className="h-60 flex items-center justify-center text-ink-faint text-sm">
      Loading your dashboard…
    </div>
  );
}
