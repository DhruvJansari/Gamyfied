import type { Metadata } from "next";

import { BoardThemes } from "./_landing/board-themes";
import { Clans } from "./_landing/clans";
import { Closer } from "./_landing/closer";
import { Community } from "./_landing/community";
import { LandingFooter } from "./_landing/footer";
import { Hero } from "./_landing/hero";
import { LandingHeader } from "./_landing/landing-header";
import { Ladder } from "./_landing/ladder";
import { Placement } from "./_landing/placement";
import { Statement } from "./_landing/statement";

export const metadata: Metadata = {
  title: { absolute: "StandByDev · Where developers establish their standing" },
};

// The story, top to bottom: the pitch and your card → what StandByDev is → how you get placed
// → where you stand → your clan → the board you can remix → your people → the invite.
// Each band has its own surface (canvas, navy, cream, coral, blue) so no two neighbours
// match, and colour means something: blue is you and your proof, warm is competition.
export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <Statement />
        <Placement />
        <Ladder />
        <Clans />
        <BoardThemes />
        <Community />
        <Closer />
      </main>
      <LandingFooter />
    </>
  );
}
