import PollDetailClient from "@/components/PollDetailClient";

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PollDetailClient pollId={id} />;
}
