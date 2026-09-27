import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { endpoints } from "@/lib/api/endpoints";
import { ErrorCode, isApiError } from "@/lib/api/errors";
import { serverRequest } from "@/lib/api/server";
import type { PublicProfile } from "@/services/profiles";

import { PublicProfileView } from "./public-profile";

// Public, indexable, guests welcome (Context.md §5.1). Rendered on the server from the public
// DTO, which carries no account data by construction. Cached for five minutes API-side.

type Params = { handle: string };

async function loadProfile(handle: string): Promise<PublicProfile | null> {
  try {
    return await serverRequest<PublicProfile>(endpoints.profiles.byHandle(handle));
  } catch (err) {
    if (isApiError(err) && (err.code === ErrorCode.NOT_FOUND || err.code === ErrorCode.VALIDATION_FAILED)) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) return { title: "Profile not found" };
  return {
    title: `${profile.displayName} (@${profile.handle})`,
    description: profile.profile.headline ?? `${profile.displayName} on StandByDev`,
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) notFound();
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:py-12">
      <PublicProfileView profile={profile} />
    </main>
  );
}
