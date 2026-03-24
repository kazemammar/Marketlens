export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-2">
          <div className="skeleton h-7 w-48 rounded" />
          <div className="skeleton h-4 w-96 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="skeleton h-48 rounded border border-[var(--border)]" />
          <div className="skeleton h-48 rounded border border-[var(--border)]" />
        </div>
        <div className="mt-4 skeleton h-96 rounded border border-[var(--border)]" />
      </div>
    </div>
  )
}
