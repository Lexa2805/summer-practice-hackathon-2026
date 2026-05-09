import Link from "next/link";
import { ArrowRight, CalendarCheck, MessageCircle, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SportCard } from "@/components/SportCard";
import { getSports } from "@/lib/api";

export default async function LandingPage() {
  const sports = await getSports();

  return (
    <main>
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        <div className="field-lines absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl content-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-accent">
              Smart social sports matching
            </p>
            <h1 className="text-5xl font-black leading-[1.02] md:text-7xl">ShowUp2Move</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/84">
              Create a profile, mark today&apos;s availability, get matched into the right group,
              chat, and build a real plan before the energy disappears.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/showup">
                <Button size="lg" variant="accent">
                  Show up today
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Open dashboard
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid content-end gap-3">
            {[
              ["1", "Profile", "Sports, city, skill signals"],
              ["2", "ShowUpToday?", "One tap availability"],
              ["3", "Match", "Sport-sized groups with captain"],
              ["4", "Coordinate", "Chat and manual events"]
            ].map(([step, title, copy]) => (
              <div key={step} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent font-black text-accent-foreground">
                    {step}
                  </span>
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-sm text-white/74">{copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">Sports ready to match</h2>
            <p className="mt-2 text-muted-foreground">Min and max players come from the backend sports table.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <SportCard key={sport.id} sport={sport} />
          ))}
        </div>
      </section>
      <section className="border-t bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
          {[
            [CalendarCheck, "Fast availability", "Daily Yes/No intent without calendar fuss."],
            [UsersRound, "Group-size aware", "Football does not get matched like tennis."],
            [MessageCircle, "Coordination loop", "Group chat and events are one click away."]
          ].map(([Icon, title, copy]) => (
            <div key={title as string} className="flex gap-3">
              <Icon className="mt-1 h-5 w-5 text-primary" />
              <div>
                <h3 className="font-bold">{title as string}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{copy as string}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
