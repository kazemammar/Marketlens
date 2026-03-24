export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-2">
          <div className="skeleton h-7 w-48 rounded" />
          <div className="skeleton h-4 w-72 rounded" />
        </div>
        <div className="skeleton h-48 rounded border border-[var(--border)] mb-4" />
        <div className="skeleton h-48 rounded border border-[var(--border)] mb-4" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded border border-[var(--border)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
