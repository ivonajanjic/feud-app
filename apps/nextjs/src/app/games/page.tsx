import { SideNavigation } from "../_components/side-navigation";

export default function GamesPage() {
  return (
    <div className="flex h-screen bg-background">
      <SideNavigation />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Games
            </h1>
            <p className="mt-2 text-muted-foreground">
              Create and manage your Family Feud games.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No games yet.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
