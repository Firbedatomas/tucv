import { SALARY_MODE, labelFor } from "@/lib/constants";
import { formatThousands } from "@/lib/format";
import type { PublicJob } from "@/lib/public-job";

// Compartido entre el render en cliente (PublicJobClient) y la tarjeta de
// compartir server-side (job-share-card) -- ambos deben mostrar exactamente
// el mismo texto de salario, no vale reimplementar el formateo dos veces.
export function salaryText(job: Pick<PublicJob, "salary_mode" | "salary_amount">): string | null {
  if (job.salary_mode === "mostrar" && job.salary_amount) return formatThousands(job.salary_amount);
  if (job.salary_mode === "a_convenir" || job.salary_mode === "segun_convenio") {
    return labelFor(SALARY_MODE, job.salary_mode);
  }
  return null;
}
