import { AlertTriangle, Check, ChevronRight, Info, OctagonAlert } from "lucide-react";
import type { FlightRule, RuleDetail, RuleLevel } from "@/lib/flight-rules";

const LEVEL_WORD: Record<RuleLevel, string> = { go: "GO", advisory: "Advisory", caution: "Caution", warning: "Warning", unknown: "No data" };

function LevelMark({ level }: { level: RuleLevel }) {
  if (level === "go") return <Check aria-hidden />;
  if (level === "warning") return <OctagonAlert aria-hidden />;
  if (level === "caution") return <AlertTriangle aria-hidden />;
  return <Info aria-hidden />;
}

/**
 * The flight rules as tiles: value, limit in plain words and state. State is never color alone: icon and
 * word go with it ([V2 10045]). A tile with a detail view opens it; the explanation is in the tooltip.
 */
export function FlightRuleTiles({ rules, onOpen }: { rules: readonly FlightRule[]; onOpen: (detail: RuleDetail) => void }) {
  return (
    <ul className="mission-rules" aria-label="Flight rules">
      {rules.map((r) => {
        const body = <>
          <span className="mission-rule-top"><span className="mission-rule-name">{r.name}</span>{r.detail ? <ChevronRight aria-hidden /> : null}</span>
          <span className="mission-rule-bottom"><span className="mission-rule-value">{r.value}<span className="mission-rule-state" data-level={r.level}><LevelMark level={r.level} />{r.level === "caution" || r.level === "warning" ? <b>{LEVEL_WORD[r.level]}</b> : null}</span></span><span className="mission-rule-limit">{r.limit}</span></span>
        </>;
        const label = `${r.name}: ${r.value}, ${r.limit.replace("*", " (assumption)")}. ${LEVEL_WORD[r.level]}. ${r.explain}`;
        return <li key={r.id} data-level={r.level}>
          {r.detail
            ? <button type="button" className="mission-rule" title={r.explain} aria-label={`${label} Open details.`} onClick={() => onOpen(r.detail!)}>{body}</button>
            : <div className="mission-rule" title={r.explain} role="group" aria-label={label}>{body}</div>}
        </li>;
      })}
    </ul>
  );
}
