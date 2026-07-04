export type JobFilters = {
  q: string;
  category: string;
  zone: string;
  shift: string;
  perk: string;
  onlyWithSalary: boolean;
};

export const emptyJobFilters: JobFilters = {
  q: "",
  category: "",
  zone: "",
  shift: "",
  perk: "",
  onlyWithSalary: false,
};

type FilterableJob = {
  name: string;
  role: string;
  category: string;
  category_other: string;
  address_zone: string;
  business_name?: string;
  shift: string[];
  perks: string[];
  salary_mode: string;
};

export function matchesJobFilters(job: FilterableJob, filters: JobFilters): boolean {
  if (filters.category && job.category !== filters.category) return false;
  if (filters.zone && !job.address_zone.toLowerCase().includes(filters.zone.toLowerCase())) return false;
  if (filters.shift && !job.shift.includes(filters.shift)) return false;
  if (filters.perk && !job.perks.includes(filters.perk)) return false;
  if (filters.onlyWithSalary && job.salary_mode !== "mostrar") return false;
  if (filters.q) {
    const haystack = [job.name, job.role, job.category_other, job.address_zone, job.business_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}
