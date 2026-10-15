import BrandDetailClient from "@/components/BrandDetailClient";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BrandDetailClient shopId={id} />;
}
