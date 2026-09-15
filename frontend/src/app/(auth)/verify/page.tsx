import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Enter your code" };

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
