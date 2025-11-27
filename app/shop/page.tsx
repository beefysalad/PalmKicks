import { Suspense } from "react";
import Shop from "../components/pages/Shop";

const ShopPage = () => {
  // Shop reads ?filter= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense>
      <Shop />
    </Suspense>
  );
};

export default ShopPage;
