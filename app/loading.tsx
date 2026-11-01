export default function Loading() {
  return (
    <main id="main" className="container page" aria-busy="true">
      <p role="status">Preparing your next discovery…</p>
      <div className="loading-grid">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton" />
        ))}
      </div>
    </main>
  );
}
