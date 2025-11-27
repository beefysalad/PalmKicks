import { CartItem } from "../../app/components/shared/CartProvider";
import { TCheckoutSchema } from "../../app/shared/zod/checkout-zod";
import { DeliveryMethod } from "@/app/shared/types/delivery";

import {
  CreateOrderItemPayload,
  CreateOrderPayload,
} from "@/app/shared/types/order";
import { ordersApi } from "../orders/api";

export interface CheckoutParams {
  values: TCheckoutSchema;
  items: CartItem[];
  deliveryMethod: DeliveryMethod;
  /** Generated once per checkout attempt so retries do not duplicate orders. */
  idempotencyKey: string;
  clearCart: () => void;
}

/**
 * Builds the order request. Only identifiers and choices are sent; the server
 * looks up prices, names and images itself and computes the total.
 */
export function buildOrderPayload(
  values: TCheckoutSchema,
  items: CartItem[],
  deliveryMethod: DeliveryMethod
): CreateOrderPayload {
  const orderItems: CreateOrderItemPayload[] = items.map((item) => ({
    productId: item.id,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
  }));

  const base = {
    customerName: values.name,
    customerEmail: values.email,
    customerPhone: values.phone,
    items: orderItems,
  };

  if (deliveryMethod === DeliveryMethod.Shipping) {
    return {
      ...base,
      deliveryMethod: "shipping",
      shippingAddress: values.address ?? "",
      shippingCity: values.city ?? "",
      shippingZipCode: values.zipCode ?? "",
    };
  }
  return {
    ...base,
    deliveryMethod: "meetup",
    meetupLocation: values.meetupLocation ?? "",
  };
}

export const checkoutFn = async ({
  values,
  items,
  deliveryMethod,
  idempotencyKey,
  clearCart,
}: CheckoutParams) => {
  if (items.length === 0) {
    throw new Error("Cart is empty");
  }

  if (!deliveryMethod) {
    throw new Error("Please select a delivery method");
  }

  const orderPayload = buildOrderPayload(values, items, deliveryMethod);

  // Create order via API
  const order = await ordersApi.createOrder(orderPayload, idempotencyKey);
  clearCart();

  // email sent server-side after the response
  return order.id;
};
