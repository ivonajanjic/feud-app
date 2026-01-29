import { SideNavigation } from "../_components/side-navigation";

export default function TeamsPage() {
  return (
    <div className="flex h-screen bg-background">
      <SideNavigation />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Teams
            </h1>
            <p className="mt-2 text-muted-foreground">
              Create and manage teams for your games.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No teams yet.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
