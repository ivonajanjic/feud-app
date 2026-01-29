import { SideNavigation } from "../_components/side-navigation";

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-background">
      <SideNavigation />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
              Configure your Family Feud application.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No settings available.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
