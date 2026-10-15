import CircleDetailClient from "@/components/CircleDetailClient";

export default async function CirclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CircleDetailClient circleId={id} />;
}
