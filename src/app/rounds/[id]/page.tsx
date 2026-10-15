import PlaceholderPage from "@/components/PlaceholderPage";

export default async function RoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PlaceholderPage
      title={`團頁面 #${id}`}
      description="團頁面（點餐狀態、留言串、分帳，F-20 ~ F-35）尚未串接。"
    />
  );
}
