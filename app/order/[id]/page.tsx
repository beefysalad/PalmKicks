import OrderComponent from "@/app/components/pages/Order";

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}
const OrderPage = async ({ params }: OrderPageProps) => {
  const { id } = await params;
  return <OrderComponent orderId={id} />;
};

export default OrderPage;
