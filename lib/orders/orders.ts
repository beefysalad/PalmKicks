import { DeliveryMethod } from "@/app/components/pages/Checkout/CheckoutForm";

/**
 * Order interface for email template compatibility
 * Note: This is kept for backward compatibility with the email template.
 * The actual order data comes from the database via the API.
 */
export interface Order {
  id: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
    size: string;
    color: string;
    quantity: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    zipCode?: string;
    meetupLocation?: string;
  };
  total: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
  createdAt: string;
  deliveryMethod: DeliveryMethod;
}

/**
 * Generate order ID (moved to server-side in orders-service.ts)
 * Kept here for reference but should not be used client-side
 * @deprecated Use the server-side generateOrderId in orders-service.ts
 */
export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7);
  return `PK-${year}-${random}`.toUpperCase();
}
