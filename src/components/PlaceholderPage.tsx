export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 py-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-text-soft">{description}</p>
    </div>
  );
}
