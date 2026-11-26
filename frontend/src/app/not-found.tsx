import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="space-backdrop starfield relative grid min-h-screen place-items-center px-4">
      <div className="relative flex flex-col items-center text-center">
        <LogoMark className="h-12 w-12" />
        <p className="eyebrow mt-8">Error 404</p>
        <h1 className="mt-3 font-serif text-5xl font-normal">Nothing to earn here.</h1>
        <p className="mt-3 text-cloud/55">This page doesn&apos;t exist — but your agents are still working.</p>
        <Button asChild className="mt-8">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
