import NewPollForm from "@/components/NewPollForm";

export default async function NewPollPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>;
}) {
  const { circleId } = await searchParams;
  return <NewPollForm circleId={circleId} />;
}
