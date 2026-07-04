import { BADGE_TONE_STYLE, computeCandidateBadges, type BadgeInput } from "@/lib/candidate-badges";

// Presentacional puro (sin hooks) -- sirve igual en server o client.
export function ProfileBadges({ candidate, className = "" }: { candidate: BadgeInput; className?: string }) {
  const badges = computeCandidateBadges(candidate);
  if (badges.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((b) => (
        <span
          key={b.label}
          className="text-xs font-semibold px-2 py-0.5 rounded-[var(--tucv-radius)]"
          style={BADGE_TONE_STYLE[b.tone]}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
