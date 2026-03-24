export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-2">
          <div className="skeleton h-7 w-40 rounded" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded border border-[var(--border)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
