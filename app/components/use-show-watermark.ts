"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserTier } from "@/app/api-actions";

/**
 * El watermark se muestra para todos los tiers EXCEPTO MAX.
 * El trial devuelve tier="max", así que durante la prueba se exporta limpio.
 * Reusa la query cacheada ["user-tier"] que ya hidrata el layout.
 */
export function useShowWatermark(): boolean {
  const { data: tier } = useQuery({ queryKey: ["user-tier"], queryFn: getUserTier });
  return (tier?.tier ?? "free") !== "max";
}
