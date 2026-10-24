import { teamLogo } from "@/lib/teams";
import { Avatar } from "./Avatar";

// Away + home team logos side by side; a team without a logo shows initials.
export function TeamPair({ away, home, fallback }: { away?: string; home?: string; fallback: string }) {
  return (
    <span className="pair">
      {[away, home].map((code, i) =>
        teamLogo(code) ? (
          <img key={i} className="team-badge" src={teamLogo(code)} alt="" width={30} height={30} loading="lazy" decoding="async" />
        ) : (
          <Avatar key={i} label={code ?? fallback} text={code?.slice(0, 3)} />
        ),
      )}
    </span>
  );
}

// Big poster used when there is no matchup image: one half per team.
export function SplitPoster({ away, home }: { away?: string; home?: string }) {
  return (
    <div className="split-poster" aria-hidden>
      {[away, home].map((code, i) => (
        <div key={i} className="half">
          {teamLogo(code) ? <img src={teamLogo(code)} alt="" width={240} height={160} decoding="async" /> : <span className="code">{code ?? "?"}</span>}
        </div>
      ))}
    </div>
  );
}
