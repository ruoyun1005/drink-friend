import NewRoundForm from "@/components/NewRoundForm";

export default async function NewRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string }>;
}) {
  const { shopId } = await searchParams;
  return <NewRoundForm initialShopId={shopId} />;
}
