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
  const primary =
    evidence.find((e) => e.kind === "community") ||
    evidence.find((e) => e.kind === "editorial") ||
    evidence[0];
  const measured = (community?.performanceVotes || 0) > 0;
  const measuredLongevity = measured && community?.longevity != null;
  const measuredProjection = measured && !!community?.projection;
  return (
    <section id="performance" className="detail-section wear-story">
      <span className="eyebrow">PERFORMANCE</span>
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
              : primary?.kind === "community" && primary.longevityScore
                ? `${primary.longevityScore} / 5`
              : primary?.longevity || "Not yet established"}
          </strong>
          <p>
            {measuredLongevity
              ? `${community?.performanceVotes} community reports; median wear time.`
              : primary?.kind === "community" && primary.longevityScore
                ? "Perfume Picks community score. This is a relative rating, not a number of hours."
              : primary?.longevityScore
                ? `${primary.longevityScore} / 5 ${primary.kind === "editorial" ? "editorial score" : "source score"}. Not an hours measurement.`
                : "How long the scent remains noticeable."}
          </p>
        </div>
        <div className="metric">
          <Wind size={24} />
          <h3>
            {!measuredProjection && primary?.kind === "community"
              ? "Sillage / projection"
              : !measuredProjection && primary?.kind === "source-report"
              ? "Scent trail"
              : "Projection"}
          </h3>
          <strong>
            {measured && community?.projection
              ? community.projection
              : primary?.kind === "community" && primary.projectionScore
                ? `${primary.projectionScore} / 5`
              : primary?.projection || "Not yet established"}
          </strong>
          <p>
            {measuredProjection
              ? "Most common published Scently community response."
              : primary?.kind === "community" && primary.projectionScore
                ? "Perfume Picks community sillage score. Sillage is the scent trail, not a measured distance."
              : primary?.projectionScore
                ? `${primary.projectionScore} / 5 ${primary.kind === "editorial" ? "editorial score" : "source score"}.`
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
              : primary?.kind === "community"
                ? "Community performance scores"
              : primary
                ? "Published source guidance"
                : "Evidence still needed"}
          </strong>
          <p>
            {measured
              ? `${community?.performanceVotes} Scently wear reports. Research sources are listed separately below.`
                : primary?.kind === "community"
                  ? "Scores are attributed to their source. Vote totals are not provided."
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
                  {e.kind === "community"
                    ? "Community performance scores"
                    : e.kind === "editorial"
                  ? "Editorial assessment"
                  : "Source-reported longevity and sillage"}{" "}
                · {e.longevity || "Longevity not supplied"} ·{" "}
                {e.projection || "Projection not supplied"}
              </p>
              <small>
                Checked {e.checkedAt.slice(0, 10)}.{" "}
                {e.kind === "community"
                  ? "Longevity and sillage are relative community scores, not guaranteed hours or distance."
                  : e.kind === "editorial"
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
