import { Button } from "@icewalk/ui/button";
import { Footnote, Title2 } from "@icewalk/ui/text";
import { Window } from "@icewalk/ui/window";
import { ExternalLink, Footprints, MonitorDot } from "lucide-react";
import type { ReactNode } from "react";
import { formatDuration, formatNumber } from "@/lib/format";
import { orderedStations, type Plan } from "@/lib/plan";

export type EvaRole = "ev" | "iv";
/** URL value of each role, for a window of its own (`/?phase=eva&role=ev1`). */
export const ROLE_PARAM: Record<EvaRole, string> = { ev: "ev1", iv: "iv" };

type RoleCard = { role: EvaRole; icon: ReactNode; title: string; subtitle: string; does: string; sees: string; note: string; join: string };

/**
 * The two seats of the EVA, as in NASA's xEVA concept of operations: the EV in the field and the IV
 * in the habitat. Each sees its own view; only the EV logs measurements.
 */
const ROLES: RoleCard[] = [
  {
    role: "ev",
    icon: <Footprints aria-hidden />,
    title: "EV1 · Field crew",
    subtitle: "Helmet view",
    does: "Walk the traverse, work each station and log what you find. The planner's updates appear in the visor.",
    sees: "Helmet HUD, track map, waypoint rings",
    note: "Drag to look · W A S D to walk",
    join: "Join as EV1",
  },
  {
    role: "iv",
    icon: <MonitorDot aria-hidden />,
    title: "IV · Habitat console",
    subtitle: "Supervision",
    does: "Follow the crew from the habitat: position, walkback margin and bingo times. Review each replan and concur or call EVA terminate.",
    sees: "Site map, crew position, replan review",
    note: "Does not log measurements",
    join: "Join as IV",
  },
];

/** First screen of the EVA phase: pick the seat. Each seat can also open in a window of its own. */
export function RoleSelect({ plan, onJoin }: { plan: Plan; onJoin: (role: EvaRole) => void }) {
  const s = plan.summary;
  return (
    <section className="mission-roles" aria-labelledby="mission-roles-title">
      <Window className="mission-roles-window">
        <header className="mission-roles-head">
          <Title2 as="h2" id="mission-roles-title">Join the EVA</Title2>
          <Footnote tone="secondary">{orderedStations(plan).length} stations · {formatNumber(s.distance_km, 2)} km · {formatDuration(s.duration_min)} · execution is simulated</Footnote>
        </header>
        <div className="mission-roles-cards">
          {ROLES.map((r) => (
            <article key={r.role} className="mission-role" aria-label={r.title}>
              <div className="mission-role-title">{r.icon}<div><strong>{r.title}</strong><span>{r.subtitle}</span></div></div>
              <p className="mission-role-does">{r.does}</p>
              <dl className="mission-role-facts">
                <div><dt>Sees</dt><dd>{r.sees}</dd></div>
                <div><dt>{r.role === "ev" ? "Controls" : "Logging"}</dt><dd>{r.note}</dd></div>
              </dl>
              <Button variant="prominent" onClick={() => onJoin(r.role)}>{r.join}</Button>
              <a className="mission-role-window" href={`/?phase=eva&role=${ROLE_PARAM[r.role]}`} target="_blank" rel="noopener">Open in a new window<ExternalLink aria-hidden /></a>
            </article>
          ))}
        </div>
      </Window>
    </section>
  );
}
