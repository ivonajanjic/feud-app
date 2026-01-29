import { SideNavigation } from "../_components/side-navigation";

export default function QuestionsPage() {
  return (
    <div className="flex h-screen bg-background">
      <SideNavigation />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Questions
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your question bank for Family Feud.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No questions yet.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
