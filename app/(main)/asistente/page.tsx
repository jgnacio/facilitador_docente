import AsistenteTab from "@/app/components/tabs/AsistenteTab";
import { SubscriptionPaywall } from "@/app/components/SubscriptionPaywall";
import { getAgentAccess } from "@/app/api-actions";

export default async function AsistentePage({
  searchParams,
}: {
  searchParams: Promise<{ ctx?: string; label?: string }>;
}) {
  const params = await searchParams;
  const contextMessage = params.ctx ? decodeURIComponent(params.ctx) : undefined;
  const contextLabel = params.label ? decodeURIComponent(params.label) : undefined;

  const access = await getAgentAccess();
  if (!access.has_access) {
    return <SubscriptionPaywall access={access} />;
  }

  return <AsistenteTab contextMessage={contextMessage} contextLabel={contextLabel} />;
}
