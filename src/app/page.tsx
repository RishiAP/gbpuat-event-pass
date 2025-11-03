// src/app/page.tsx
import AppBar from "@/components/AppBar";
import { Button } from "@/components/ui/button";
import { Shield, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ───── AppBar ───── */}
      <AppBar />

      {/* ───── Subtle background blobs (optional) ───── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      {/* ───── Centered content ───── */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl text-center space-y-12">
          {/* Hero */}
          <div className="space-y-5 animate-fade-in-up">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Event Management
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Seamlessly manage events, verify attendees, and track participation at{" "}
              <span className="font-semibold text-primary">GBPUAT</span>.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up animation-delay-300">
            <Link href="/admin">
              <Button
                size="lg"
                className="h-14 px-8 text-lg font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <Shield className="mr-3 h-6 w-6" />
                Go to Admin
              </Button>
            </Link>

            <Link href="/verifier">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg font-semibold shadow-lg transition-all hover:scale-105"
              >
                <Users className="mr-3 h-6 w-6" />
                Verify Users
              </Button>
            </Link>
          </div>

          {/* Tagline */}
          <p className="text-sm text-muted-foreground animate-fade-in-up animation-delay-500">
            Powered by{" "}
            <span className="font-medium text-primary">GBPUAT Event System</span>
          </p>
        </div>
      </main>
    </div>
  );
}