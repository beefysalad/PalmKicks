import { CartItem } from "../../app/components/shared/CartProvider";
import { TCheckoutSchema } from "../../app/shared/zod/checkout-zod";
import { DeliveryMethod } from "@/app/shared/types/delivery";

import { CreateOrderPayload } from "@/app/shared/types/order";
import { ordersApi } from "../orders/api";

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

  const orderPayload: CreateOrderPayload = {
    customerName: values.name,
    customerEmail: values.email,
    customerPhone: values.phone,
    items: items.map((item) => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
    })),
    total,
  };

  // Add shipping or meetup location based on delivery method
  if (deliveryMethod === DeliveryMethod.Shipping) {
    orderPayload.shippingAddress = values.address;
    orderPayload.shippingCity = values.city;
    orderPayload.shippingZipCode = values.zipCode;
  } else {
    orderPayload.meetupLocation = values.meetupLocation;
  }

  // Create order via API
  const order = await ordersApi.createOrder(orderPayload);
  clearCart();

  // email sent server-side in addOrder
  return order.id;
};
