"use client";

import { useEffect, useState } from "react";
import type { PublicJobListItem } from "@/lib/public-jobs-list";
import { JobCard } from "@/components/landing/JobCard";

function sameZone(a: string, b: string): boolean {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2),
    );
  const ta = tokenize(a);
  for (const t of tokenize(b)) {
    if (ta.has(t)) return true;
  }
  return false;
}

export function RelatedJobs({
  currentJobId,
  category,
  addressZone,
}: {
  currentJobId: string;
  category: string;
  addressZone: string;
}) {
  const [related, setRelated] = useState<PublicJobListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-jobs")
      .then((r) => r.json())
      .then((jobs: PublicJobListItem[]) => {
        if (cancelled) return;
        const scored = jobs
          .filter((j) => j.id !== currentJobId)
          .map((j) => {
            const sameCategory = j.category === category;
            const zoneMatch = sameZone(j.address_zone, addressZone);
            const score = (sameCategory ? 2 : 0) + (zoneMatch ? 1 : 0);
            return { job: j, score };
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score || Number(b.job.featured) - Number(a.job.featured));
        setRelated(scored.slice(0, 4).map((s) => s.job));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentJobId, category, addressZone]);

  if (!related || related.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Otras búsquedas que te pueden interesar</h2>
      <div className="space-y-3">
        {related.map((job) => (
          <JobCard key={job.id} job={job} featured={job.featured} />
        ))}
      </div>
    </div>
  );
}
