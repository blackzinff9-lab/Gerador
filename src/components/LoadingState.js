export default function LoadingState() {
  return (
    <div className="space-y-4" aria-label="Carregando resultados">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="skeleton h-7 w-7" />
            <div className="skeleton h-5 w-28" />
          </div>
          <div className="space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="flex flex-wrap gap-1.5 pt-2">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="skeleton h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
