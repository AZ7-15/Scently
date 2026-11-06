import { Clock, Wind } from "lucide-react";
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
    evidence.find((e) => e.kind === "source-report") ||
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
              : primary?.kind === "source-report"
                ? primary.longevity || "Not reported"
              : "Hours not reported"}
          </strong>
          <p>
            {measuredLongevity
              ? `${community?.performanceVotes} community reports; median wear time.`
              : primary?.kind === "source-report" && primary.longevity
                ? "Scento's most common wearer-reported longevity band. Your result can vary with skin, weather and application."
                : "No matching source or wear reports provide an hour range for this fragrance."}
          </p>
        </div>
        <div className="metric">
          <Wind size={24} />
          <h3>
            {!measuredProjection && primary?.kind === "community"
              ? "Sillage / projection"
              : !measuredProjection && primary?.kind === "source-report"
              ? "Projection / sillage"
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
                  : "How far the fragrance is noticed around you. Projection is about distance; longevity is about hours."}
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
                  : "Longevity hours follow Scento's documented bands; projection reflects its sillage category."}
              </small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
