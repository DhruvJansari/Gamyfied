import type { ReactNode } from "react";

/** Centred single column shared by sign-in, sign-up and verify. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-[540px]">{children}</div>
    </main>
  );
}
