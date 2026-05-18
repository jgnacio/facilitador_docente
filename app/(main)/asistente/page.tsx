import AsistenteTab from "@/app/components/tabs/AsistenteTab";

export default async function AsistentePage({
  searchParams,
}: {
  searchParams: Promise<{ ctx?: string; label?: string }>;
}) {
  const params = await searchParams;
  const contextMessage = params.ctx ? decodeURIComponent(params.ctx) : undefined;
  const contextLabel = params.label ? decodeURIComponent(params.label) : undefined;
  return <AsistenteTab contextMessage={contextMessage} contextLabel={contextLabel} />;
}
