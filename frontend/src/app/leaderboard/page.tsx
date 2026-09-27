import type { Metadata } from "next";
import { Suspense } from "react";

import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { serverRequest } from "@/lib/api/server";
import { DEFAULT_BOARD, type LeaderboardPage, type TierLetter } from "@/services/leaderboard";

import { LeaderboardView } from "./leaderboard-page";
import { parsePage, parseTier } from "./paging";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Every ranked developer on StandByDev, by verified evidence. S tier is twenty chairs.",
};

// Public, guests welcome (Context.md §5.1), server-rendered so the busiest page on the site
// paints with rows in the HTML. The API's answer seeds the client query; if the API is down at
// render time the client fetches instead and owns the error state, rather than the route 500ing.

async function loadPage(page: number, tier: TierLetter | null): Promise<LeaderboardPage | null> {
  try {
    return await serverRequest<LeaderboardPage>(endpoints.leaderboard.page(DEFAULT_BOARD, page, tier));
  } catch (err) {
    if (isApiError(err)) return null;
    throw err;
  }
}

export default async function Page({ searchParams }: PageProps<"/leaderboard">) {
  const params = await searchParams;
  const initialPage = await loadPage(parsePage(params.page), parseTier(params.tier));
  return (
    // Full width: the board is the busiest page and the table wants every column it can get.
    <main className="w-full flex-1 px-4 py-6 md:px-10 md:py-8">
      {/* useSearchParams (the page number) needs a Suspense boundary for static rendering. */}
      <Suspense>
        <LeaderboardView initialPage={initialPage} />
      </Suspense>
    </main>
  );
}
