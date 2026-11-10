import { ListRow, ListSection } from "@icewalk/ui/list";
import { Footnote } from "@icewalk/ui/text";
import { designSession } from "@/mock/design-session";
import { RowLabel, Value } from "./parts";

export function ToolAssessment() {
  return (
    <section aria-label="Which tool?" className="mission-stack">
      <Footnote tone="secondary">Radar to survey. Drill to confirm.</Footnote>
      <ListSection footer="Illustrative yield · assumed tools and simulated performance.">
        {designSession.toolYield.map((tool) => (
          <ListRow
            key={tool.id}
            trailing={
              <Value>
                ≤ {tool.reachM} m · ~{tool.stationsPerFind}/find
              </Value>
            }
          >
            <RowLabel title={tool.label} detail={`${tool.evidence} evidence`} />
          </ListRow>
        ))}
      </ListSection>
    </section>
  );
}
