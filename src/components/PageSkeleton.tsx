export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface animate-pulse">
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="h-4 w-48 bg-border rounded" />
          <div className="flex gap-4 mt-3 pb-3">
            <div className="h-4 w-14 bg-border rounded" />
            <div className="h-4 w-16 bg-border rounded" />
            <div className="h-4 w-12 bg-border rounded" />
            <div className="h-4 w-12 bg-border rounded" />
          </div>
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 h-24" />
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 h-32" />
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 h-40" />
      </main>
    </div>
  );
}
