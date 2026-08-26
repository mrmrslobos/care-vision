import { AppHeader } from "@/components/layout/app-header";
import { VisitForm } from "@/components/visits/visit-form";

export default function NewVisitPage() {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-semibold">Log a visit</h1>
          <p className="text-sm text-muted-foreground">
            Work through the checklist during or after your visit. Add photos when
            it helps you remember or advocate.
          </p>
        </div>
        <VisitForm />
      </main>
    </div>
  );
}
