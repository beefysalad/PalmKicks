import { DeliveryMethod } from "@/app/shared/types/delivery";
import type { OrderStatus } from "@/app/shared/order-lifecycle";

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
  status: OrderStatus;
  createdAt: string;
  deliveryMethod: DeliveryMethod;
}
