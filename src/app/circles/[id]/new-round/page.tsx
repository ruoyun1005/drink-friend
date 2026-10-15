import NewRoundForm from "@/components/NewRoundForm";

export default async function NewCircleRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewRoundForm circleId={id} />;
}
