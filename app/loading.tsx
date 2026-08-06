export default function Loading() {
  return (
    <div
      className="mx-auto min-h-[55vh] max-w-7xl animate-pulse px-5 py-24 sm:px-8"
      aria-label="Loading page"
    >
      <div className="h-4 w-32 rounded bg-sky-100" />
      <div className="mt-5 h-12 max-w-2xl rounded bg-sky-100" />
      <div className="mt-4 h-5 max-w-xl rounded bg-slate-100" />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-56 rounded-3xl bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}
