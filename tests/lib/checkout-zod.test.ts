import { describe, it, expect } from "vitest";
import { checkoutSchemaFor } from "@/app/shared/zod/checkout-zod";
import { DeliveryMethod } from "@/app/shared/types/delivery";

const base = { name: "Juan", email: "j@example.test", phone: "09171234567" };

describe("checkout form schema", () => {
  it("shipping requires address, city and zip", () => {
    const s = checkoutSchemaFor(DeliveryMethod.Shipping);
    expect(s.safeParse({ ...base, address: "", city: "Cebu", zipCode: "6000" }).success).toBe(false);
    expect(s.safeParse({ ...base, address: "1 St", city: "", zipCode: "6000" }).success).toBe(false);
    expect(s.safeParse({ ...base, address: "1 St", city: "Cebu", zipCode: " " }).success).toBe(false);
    expect(s.safeParse({ ...base, address: "1 St", city: "Cebu", zipCode: "6000" }).success).toBe(true);
  });

  it("meetup requires meetupLocation but not the address", () => {
    const s = checkoutSchemaFor(DeliveryMethod.Meetup);
    expect(s.safeParse({ ...base, meetupLocation: "" }).success).toBe(false);
    expect(s.safeParse({ ...base, meetupLocation: "SM City" }).success).toBe(true);
  });
});
