import { Clock, Wind, BookOpen } from "lucide-react";
import type { WearEvidence } from "@/lib/wear-evidence";

export function WearPerformance({
  evidence,
  community,
}: {
  evidence: WearEvidence[];
  community?: {
    longevity?: number | null;
    projection?: string | null;
    performanceVotes?: number;
  };
}) {
  const primary = evidence.find((e) => e.kind === "editorial") || evidence[0];
  const measured = (community?.performanceVotes || 0) > 0;
  const measuredLongevity = measured && community?.longevity != null;
  const measuredProjection = measured && !!community?.projection;
  return (
    <section id="performance" className="detail-section wear-story">
      <span className="eyebrow">THE HOURS AFTER THE FIRST SPRAY</span>
      <h2>How it wears</h2>
      <p className="info-line">
        Skin, weather, application and formulation affect performance. These are
        source-reported impressions, not a promise of wear time.
      </p>
      <div className="metrics">
        <div className="metric">
          <Clock size={24} />
          <h3>Longevity</h3>
          <strong>
            {measured &&
            community?.longevity !== null &&
            community?.longevity !== undefined
              ? `${community.longevity} hours`
              : primary?.longevity || "Not yet established"}
          </strong>
          <p>
            {measuredLongevity
              ? `${community?.performanceVotes} community reports; median wear time.`
              : primary?.longevityScore
                ? `${primary.longevityScore} / 5 editorial score. Not an hours measurement.`
                : "How long the scent remains noticeable."}
          </p>
        </div>
        <div className="metric">
          <Wind size={24} />
          <h3>
            {!measuredProjection && primary?.kind === "source-report"
              ? "Scent trail"
              : "Projection"}
          </h3>
          <strong>
            {measured && community?.projection
              ? community.projection
              : primary?.projection || "Not yet established"}
          </strong>
          <p>
            {measuredProjection
              ? "Most common published Scently community response."
              : primary?.projectionScore
                ? `${primary.projectionScore} / 5 editorial score.`
                : primary?.kind === "source-report"
                  ? "The source reports sillage: the trail left by a scent, rather than a measured projection distance."
                  : "How far the fragrance is perceived around you."}
          </p>
        </div>
        <div className="metric">
          <BookOpen size={24} />
          <h3>Research & evidence</h3>
          <strong>
            {measured
              ? "Community wear reports"
              : primary
                ? "Published source guidance"
                : "Evidence still needed"}
          </strong>
          <p>
            {measured
              ? `${community?.performanceVotes} Scently wear reports. Research sources are listed separately below.`
              : primary
                ? "Attributed by fragrance and edition. Missing figures stay unknown."
                : "The checked sources do not establish performance for this edition. No value is inferred from notes, brand or concentration."}
          </p>
        </div>
      </div>
      {evidence.length > 0 && (
        <div className="wear-evidence-list">
          {evidence.map((e) => (
            <div className="wear-evidence" key={e.sourceUrl}>
              <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">
                {e.source}
              </a>
              <p>
                {e.kind === "editorial"
                  ? "Editorial assessment"
                  : "Source-reported longevity and sillage"}{" "}
                · {e.longevity || "Longevity not supplied"} ·{" "}
                {e.projection || "Projection not supplied"}
              </p>
              <small>
                Checked {e.checkedAt.slice(0, 10)}.{" "}
                {e.kind === "editorial"
                  ? "Scores use the publisher’s 1–5 scale; they are not Scently community votes."
                  : "Supplier-reported categories; underlying review counts are not imported."}
              </small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
