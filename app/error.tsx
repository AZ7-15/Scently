"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container page">
      <div className="empty-state">
        <h1>We couldn’t load this page.</h1>
        <p>We couldn’t load this page. Please try again in a moment.</p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
