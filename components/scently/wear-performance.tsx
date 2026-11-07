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
    evidence.find((item) => item.kind === "manual-research") ||
    evidence.find((item) => item.kind === "source-report") ||
    evidence.find((item) => item.kind === "community") ||
    evidence.find((item) => item.kind === "editorial") ||
    evidence[0];
  const longevitySource =
    evidence.find((item) => item.kind === "manual-research" && item.longevity) ||
    evidence.find((item) => item.kind === "source-report" && item.longevity) ||
    evidence.find((item) => item.kind === "grounded-research" && item.longevity);
  const projectionSource =
    evidence.find((item) => item.kind === "manual-research" && item.projection) ||
    evidence.find((item) => item.kind === "source-report" && item.projection) ||
    evidence.find((item) => item.kind === "grounded-research" && item.projection);
  const measured = (community?.performanceVotes || 0) > 0;
  const measuredLongevity = measured && community?.longevity != null;
  const measuredProjection = measured && !!community?.projection;
  const projectionIsDuration =
    projectionSource?.projection?.toLowerCase().includes("hour") || false;

  return (
    <section id="performance" className="detail-section wear-story">
      <span className="eyebrow">PERFORMANCE</span>
      <h2>How it wears</h2>
      <p className="info-line">
        Skin, weather, application and formulation affect performance. Treat
        reported ranges as a guide, not a promise.
      </p>
      <div className="metrics">
        <div className="metric">
          <Clock size={24} />
          <h3>Longevity</h3>
          <strong>
            {measuredLongevity
              ? `${community?.longevity} hours`
              : longevitySource?.longevity || "Hours not reported"}
          </strong>
          <p>
            {measuredLongevity
              ? `${community?.performanceVotes} community reports; median wear time.`
              : longevitySource?.kind === "source-report"
                ? "A common wearer-reported range. Your result can vary with skin, weather and application."
                : longevitySource
                  ? "A practical estimate from published wear reports. Results vary from person to person."
                  : "No published hour range is available for this fragrance."}
          </p>
        </div>
        <div className="metric">
          <Wind size={24} />
          <h3>
            {measuredProjection
              ? "Sillage / projection"
              : projectionIsDuration
                ? "Projection duration"
                : projectionSource || primary?.kind === "community"
                  ? "Projection / sillage"
                  : "Projection"}
          </h3>
          <strong>
            {measuredProjection
              ? community?.projection
              : projectionSource?.projection ||
                (primary?.kind === "community" && primary.projectionScore
                  ? `${primary.projectionScore} / 5`
                  : primary?.projection || "Not yet established")}
          </strong>
          <p>
            {measuredProjection
              ? "Most common Scently community response."
              : projectionIsDuration
                ? "How long reports say noticeable projection lasts. Wear varies by person and conditions."
                : projectionSource
                  ? projectionSource.kind === "manual-research"
                    ? "Wear reports suggest a more noticeable opening that settles over time. Projection varies by person and setting."
                    : "Projection strength describes how far people report that the scent carries."
                  : primary?.kind === "community" && primary.projectionScore
                    ? "Community sillage score. Sillage is the scent trail, not a measured distance."
                    : primary?.projectionScore
                      ? `${primary.projectionScore} / 5 score.`
                      : "Projection describes how far the scent is noticed around you."}
          </p>
        </div>
      </div>
    </section>
  );
}
