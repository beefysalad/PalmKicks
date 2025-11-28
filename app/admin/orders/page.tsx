import OrdersListPage from "@/app/components/pages/Admin/Orders/OrdersList";
import { Suspense } from "react";

export default function OrdersPage() {
  return <Suspense fallback={<p className="p-4 text-muted-foreground">Loading orders…</p>}><OrdersListPage /></Suspense>;
}
