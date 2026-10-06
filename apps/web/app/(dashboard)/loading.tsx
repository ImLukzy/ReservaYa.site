export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando panel">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-piedra" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="card-tactil h-28 animate-pulse bg-piedra/60" />
        ))}
      </div>
      <div className="card-tactil h-72 animate-pulse bg-piedra/60" />
    </div>
  );
}
