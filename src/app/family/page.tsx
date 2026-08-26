"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { useAuth } from "@/components/auth/auth-provider";
import {
  createCircle,
  joinCircle,
} from "@/lib/visits-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FamilyPage() {
  const router = useRouter();
  const { user, loading, circles, refreshCircles, signInWithEmail, signOut, configured } =
    useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [circleName, setCircleName] = useState("Our family care circle");
  const [patientLabel, setPatientLabel] = useState("Mom");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setMessage("");
    const { error } = await signInWithEmail(email.trim());
    setBusy(false);
    setMessage(
      error
        ? error
        : "Check your email for a magic link to sign in."
    );
  }

  async function handleCreate() {
    if (!displayName.trim()) return;
    setBusy(true);
    const circle = await createCircle(
      circleName.trim(),
      patientLabel.trim(),
      displayName.trim()
    );
    setBusy(false);
    if (circle) {
      await refreshCircles();
      router.push("/");
    } else {
      setMessage("Could not create circle. Are you signed in?");
    }
  }

  async function handleJoin() {
    if (!displayName.trim() || !inviteCode.trim()) return;
    setBusy(true);
    const circle = await joinCircle(inviteCode.trim(), displayName.trim());
    setBusy(false);
    if (circle) {
      await refreshCircles();
      router.push("/");
    } else {
      setMessage("Invalid invite code or already joined.");
    }
  }

  if (!configured) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-10 space-y-4">
          <h1 className="text-xl font-semibold">Family sync</h1>
          <p className="text-muted-foreground text-sm">
            Add Supabase env vars to enable shared timelines. Visits still work
            locally on this device.
          </p>
          <Link
            href="/"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Back home
          </Link>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader />
        <main className="p-6 text-muted-foreground">Loading…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full flex flex-col bg-background">
        <AppHeader />
        <main className="mx-auto w-full max-w-md px-4 py-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Sign in to share visits</h1>
            <p className="text-sm text-muted-foreground">
              Spouse and siblings see the same timeline when everyone joins your
              family care circle.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Magic link</CardTitle>
              <CardDescription>No password — we email you a link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={busy || !email.trim()}
                onClick={handleSignIn}
              >
                Email me a sign-in link
              </Button>
              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (circles.length > 0) {
    const active = circles[0];
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Family circle</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {user.email}
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{active.name}</CardTitle>
              <CardDescription>
                Tracking care for {active.patientLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Invite code</span> (share with family):
              </p>
              <p className="font-mono text-lg tracking-widest bg-muted px-3 py-2 rounded-md">
                {active.inviteCode}
              </p>
              <p className="text-muted-foreground">
                They sign in at Family → Join with this code.
              </p>
            </CardContent>
          </Card>
          <div className="flex gap-2">
          <Link
            href="/"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Timeline
          </Link>
            <Button variant="ghost" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-8 space-y-6">
        <h1 className="text-xl font-semibold">Set up family sharing</h1>
        <div className="space-y-2">
          <Label htmlFor="displayName">Your name (shown on visits)</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex"
          />
        </div>
        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">Create circle</TabsTrigger>
            <TabsTrigger value="join" className="flex-1">Join with code</TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label>Circle name</Label>
              <Input value={circleName} onChange={(e) => setCircleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Who we&apos;re caring for</Label>
              <Input
                value={patientLabel}
                onChange={(e) => setPatientLabel(e.target.value)}
              />
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={busy || !displayName.trim()}
              onClick={handleCreate}
            >
              Create & start sharing
            </Button>
          </TabsContent>
          <TabsContent value="join" className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label>Invite code from family</Label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="abc123"
              />
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={busy || !inviteCode.trim()}
              onClick={handleJoin}
            >
              Join circle
            </Button>
          </TabsContent>
        </Tabs>
        {message && <p className="text-sm text-destructive">{message}</p>}
      </main>
    </div>
  );
}
