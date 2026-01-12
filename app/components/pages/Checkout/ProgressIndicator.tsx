import { DeliveryMethod } from "./CheckoutForm";

interface ProgressIndicatorProps {
  deliveryMethod: DeliveryMethod;
}
const ProgressIndicator = ({ deliveryMethod }: ProgressIndicatorProps) => {
  return (
    <div className='mb-8 hidden sm:block'>
      <div className='flex items-center justify-center gap-2'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground'>
            1
          </div>
          <span className='text-sm font-medium text-foreground'>
            Delivery Method
          </span>
        </div>
        <div className='h-px w-12 bg-border' />
        <div className='flex items-center gap-2'>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              deliveryMethod
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            2
          </div>
          <span
            className={`text-sm font-medium ${
              deliveryMethod ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Contact & Details
          </span>
        </div>
        <div className='h-px w-12 bg-border' />
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-muted-foreground'>
            3
          </div>
          <span className='text-sm font-medium text-muted-foreground'>
            Review & Pay
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
