import { connection } from "next/server";
import { Dashboard } from "@/components/Dashboard";
import { dashboardConfig } from "@/lib/dashboard-config";

export default async function Home() {
  // Read settings from the environment at request time, not build time.
  await connection();
  return <Dashboard config={dashboardConfig()} />;
}
