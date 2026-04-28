import { Briefcase } from "lucide-react";
import type { MiniApp } from "./types";
import { ToteDashboardWidget } from "@/components/tote/dashboard-widget";

export const toteMiniApp: MiniApp = {
  id: "tote",
  label: "Tote",
  href: "/tote",
  icon: Briefcase,
  order: 30,
  quickAdd: { label: "Plan an event", href: "/tote/new" },
  dashboardWidget: ToteDashboardWidget,
  // No share-target — Tote is first-party event creation only.
};
