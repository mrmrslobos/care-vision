"use client";

import { useEffect, useState } from "react";
import {
  deleteReminder,
  listReminders,
  saveReminder,
  getActiveCircleId,
} from "@/lib/visits-repository";
import type { VisitReminder } from "@/types/care";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";

export function ReminderManager() {
  const { user, configured } = useAuth();
  const [reminders, setReminders] = useState<VisitReminder[]>([]);
  const [title, setTitle] = useState("Visit reminder");
  const [remindAt, setRemindAt] = useState("");
  const [notifOk, setNotifOk] = useState(false);

  async function load() {
    setReminders(await listReminders());
  }

  useEffect(() => {
    if (user && configured) load();
  }, [user, configured]);

  useEffect(() => {
    if (!user || !configured || reminders.length === 0) return;

    const tick = () => {
      const now = Date.now();
      reminders.forEach((r) => {
        if (!r.enabled) return;
        const at = new Date(r.remindAt).getTime();
        if (at <= now && at > now - 60000) {
          if (notifOk && "Notification" in window) {
            new Notification(r.title, {
              body: "Time for a care visit check-in.",
              tag: r.id,
            });
          }
        }
      });
    };

    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [reminders, user, configured, notifOk]);

  async function requestNotif() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifOk(perm === "granted");
  }

  async function addReminder() {
    const circleId = getActiveCircleId();
    if (!circleId || !remindAt) return;
    const saved = await saveReminder({
      circleId,
      userId: user!.id,
      title: title.trim() || "Visit reminder",
      remindAt: new Date(remindAt).toISOString(),
      enabled: true,
    });
    if (saved) {
      setReminders((prev) => [...prev, saved]);
      setRemindAt("");
    }
  }

  async function remove(id: string) {
    await deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  if (!user || !configured) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Sign in and join a family circle to set visit reminders.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visit reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!notifOk && (
          <Button type="button" variant="outline" size="sm" onClick={requestNotif}>
            Enable browser notifications
          </Button>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Remind me at</Label>
            <Input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-teal-600 hover:bg-teal-700"
          disabled={!remindAt}
          onClick={addReminder}
        >
          Add reminder
        </Button>
        {reminders.length > 0 && (
          <ul className="space-y-2 text-sm">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 border rounded-md px-3 py-2"
              >
                <span>
                  {r.title} — {new Date(r.remindAt).toLocaleString()}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(r.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
