export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="flex gap-4 mt-3 pb-3">
            <div className="h-4 w-14 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-12 bg-gray-200 rounded" />
            <div className="h-4 w-12 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-24" />
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-32" />
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-40" />
      </main>
    </div>
  );
}
