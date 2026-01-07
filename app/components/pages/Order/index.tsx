import React from "react";
import OrderConfirmation from "./OrderConfirmation";

interface OrderComponentProps {
  orderId: string;
}
const OrderComponent = ({ orderId }: OrderComponentProps) => {
  return (
    <main className='min-h-screen py-12'>
      <div className='w-full px-4'>
        <OrderConfirmation orderId={orderId} />
      </div>
    </main>
  );
};

export default OrderComponent;
