import { CartItem } from "../../app/components/shared/CartProvider";
import { TCheckoutSchema } from "../../app/shared/zod/checkout-zod";
import { DeliveryMethod } from "../../app/components/pages/Checkout/CheckoutForm";

import axios from "axios";
import { CreateOrderPayload } from "@/app/shared/types/order";
import { ordersApi } from "../orders/api";
import { api, ApiResponse } from "../axios";

export interface CheckoutParams {
  values: TCheckoutSchema;
  items: CartItem[];
  total: number;
  deliveryMethod: DeliveryMethod;
  clearCart: () => void;
}
interface Email {
  emailSent: boolean;
  messageId: string;
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

  //fire and forget para di ma stop ang process if email sending encounters an error
  try {
    const emailResponse = await api.post<ApiResponse<Email>>(
      "/orders/confirm",
      { orderId: order.id }
    );

    if (!emailResponse.data.data?.emailSent) {
      console.warn(
        "Order confirmation email was not sent or API indicated an issue"
      );
    }
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }

  return order.id;
};
