import { SideNavigation } from "./_components/side-navigation";

export default function HomePage() {
  return (
    <div className="flex h-screen bg-background">
      <SideNavigation />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Welcome to the Family Feud game management dashboard.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Games
              </h3>
              <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Questions
              </h3>
              <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Teams
              </h3>
              <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
