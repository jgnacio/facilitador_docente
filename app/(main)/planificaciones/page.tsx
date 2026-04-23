"use client";
import PlanificacionesTab from "@/app/components/tabs/PlanificacionesTab";
import { useRouter } from "next/navigation";

export default function PlanificacionesPage() {
  const router = useRouter();
  return <PlanificacionesTab onGoToPlanificador={() => router.push("/asistente")} />;
}
