import NewRoundForm from "@/components/NewRoundForm";

export default async function NewRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string; circleId?: string }>;
}) {
  const { shopId, circleId } = await searchParams;
  return <NewRoundForm initialShopId={shopId} circleId={circleId} />;
}
