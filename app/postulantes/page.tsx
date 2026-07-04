import type { Metadata } from "next";
import { PostulantesDirectory } from "@/components/postulantes/PostulantesDirectory";

export const metadata: Metadata = {
  title: "Gente lista para laburar cerca tuyo — TuCV",
  description: "Postulantes que activaron su perfil público en TuCV: rubro, zona y disponibilidad, sin necesidad de cuenta.",
  alternates: { canonical: "/postulantes" },
};

export default function PostulantesPage() {
  return (
    <main className="flex-1">
      <PostulantesDirectory />
    </main>
  );
}
