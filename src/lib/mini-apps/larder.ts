import { ShoppingBasket } from "lucide-react";
import type { MiniApp } from "./types";
import { LarderDashboardWidget } from "@/components/larder/dashboard-widget";

export const larderMiniApp: MiniApp = {
  id: "larder",
  label: "Larder",
  href: "/larder",
  icon: ShoppingBasket,
  order: 40,
  quickAdd: { label: "Add to larder", href: "/larder" },
  dashboardWidget: LarderDashboardWidget,
};
