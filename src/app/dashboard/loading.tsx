export default function Loading() {
  return (
    <div className="min-h-screen bg-surface animate-pulse">
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between">
          <div className="h-5 w-24 bg-border rounded" />
          <div className="h-4 w-32 bg-border rounded" />
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 w-32 bg-border rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white rounded-card border-[0.5px] border-border" />
          ))}
        </div>
      </main>
    </div>
  );
}
