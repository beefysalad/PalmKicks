import { DeliveryMethod } from "@/app/components/pages/Checkout/CheckoutForm";

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
  deliveryMethod: DeliveryMethod
}

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7);
  return `PK-${year}-${random}`.toUpperCase();
}

export function saveOrder(order: Order): void {
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem("palm-kicks-orders", JSON.stringify(orders));
}

export function getOrders(): Order[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("palm-kicks-orders");
  return stored ? JSON.parse(stored) : [];
}

export function getOrderById(id: string): Order | undefined {
  const orders = getOrders();
  return orders.find((order) => order.id === id);
}
