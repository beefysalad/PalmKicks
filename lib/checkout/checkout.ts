import { generateOrderId, saveOrder } from "@/lib/orders/orders";
import { CartItem } from "../../app/components/shared/CartProvider";
import { TCheckoutSchema } from "../../app/components/pages/Checkout/checkoutZod";
import { DeliveryMethod } from "../../app/components/pages/Checkout/CheckoutForm";
import axios from "axios";
export interface CheckoutParams {
  values: TCheckoutSchema;
  items: CartItem[];
  total: number;
  deliveryMethod: DeliveryMethod;
  clearCart: () => void;
}

export const checkoutFn = async ({
  values,
  items,
  total,
  deliveryMethod,
  clearCart,
}: CheckoutParams) => {
  if (items.length === 0) {
    throw new Error("Cart is empty");
  }

  if (!deliveryMethod) {
    throw new Error("Please select a delivery method");
  }

  const orderId = generateOrderId();
  const order = {
    id: orderId,
    items: items.map((item) => ({ ...item })),
    customer: values,
    deliveryMethod,
    total,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  saveOrder(order);
  clearCart();

  try {
    const emailResponse = await axios.post("/api/orders/confirm", order);
    const emailResult = emailResponse.data;

    if (!emailResult.emailSent) {
      console.warn(
        "Order confirmation email was not sent or API indicated an issue:",
        emailResult.error
      );
    }
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }

  return orderId;
};
