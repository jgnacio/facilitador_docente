"use client";
import DashboardTab from "@/app/components/tabs/DashboardTab";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  return <DashboardTab onNavigate={(t) => router.push(`/${t}`)} />;
}
