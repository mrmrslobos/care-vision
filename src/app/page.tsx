import { connection } from "next/server";
import { Dashboard } from "@/components/Dashboard";
import { dashboardConfig } from "@/lib/dashboard-config";

export default async function Home({ searchParams }: PageProps<"/">) {
  // Read settings from the environment at request time, not build time.
  await connection();
  const params = await searchParams;
  return <Dashboard config={dashboardConfig()} kiosk={params.kiosk !== undefined} />;
}
