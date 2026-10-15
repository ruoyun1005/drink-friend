import JoinRoundClient from "@/components/JoinRoundClient";

export default async function JoinRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JoinRoundClient roundId={id} />;
}
