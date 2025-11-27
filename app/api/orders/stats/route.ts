import { requireAdmin } from "@/lib/require-admin";
import { apiError, apiOk } from "@/lib/api-response";
import { getOrderStats } from "@/app/api/orders/orders-service";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return apiOk(await getOrderStats());
  } catch (error) {
    console.error("Error fetching order stats:", error);
    return apiError(500, "Failed to fetch order stats");
  }
}
