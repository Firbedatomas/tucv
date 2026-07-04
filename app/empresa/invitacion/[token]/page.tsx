import { InviteAcceptCard } from "@/components/empresa/InviteAcceptCard";

export const metadata = {
  title: "Invitación a un equipo — TuCV",
  robots: { index: false, follow: false },
};

export default async function InvitacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <InviteAcceptCard token={token} />
      </div>
    </main>
  );
}
