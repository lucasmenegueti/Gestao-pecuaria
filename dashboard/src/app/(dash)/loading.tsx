// Esqueleto mostrado no clique, enquanto o servidor monta a seção. Sem este
// arquivo o Next não pré-carrega rota dinâmica e a tela antiga fica parada.
export default function DashLoading() {
  return (
    <main className="animate-pulse px-4 py-6 md:px-8 md:py-8" aria-busy="true" aria-label="Carregando">
      <div className="mb-6">
        <div className="h-3 w-48 rounded-md bg-grey-100" />
        <div className="mt-2 h-8 w-56 rounded-md bg-grey-100" />
        <div className="mt-2 h-4 w-32 rounded-md bg-grey-100" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-bg-elevated" />
        ))}
      </div>
      <div className="h-96 rounded-lg border border-border bg-bg-elevated" />
    </main>
  );
}
