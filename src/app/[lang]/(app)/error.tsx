"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/error-view";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorView kind="error" retry={retry} />;
}
