"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

// Expenses now lives inside the combined Income & Expenses tab — keep this route as a redirect
// so existing bookmarks and links still work.
export default function ExpensesRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/income?tab=expenses");
  }, [router]);

  return null;
}

