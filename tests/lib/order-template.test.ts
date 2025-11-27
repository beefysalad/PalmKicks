import { describe, it, expect, vi } from "vitest";

vi.mock("@/helpers", () => ({ getDevelopmentEnvironment: () => "test" }));

import { buildOrderConfirmationEmail } from "@/lib/orders/order-confirmation-template";
import { DeliveryMethod } from "@/app/shared/types/delivery";

const evil = "<img onerror=1>";
const base = {
  id: `PK-<b>1</b>`,
  items: [
    { id: "1", name: 'a"b', price: 10, image: "/x.png", size: "<s>", color: "<c>", quantity: 1 },
  ],
  customer: {
    name: evil,
    email: "<e@x.com>",
    phone: "<p>",
    address: "<addr>",
    city: "<city>",
    zipCode: "<zip>",
    meetupLocation: "<meet>",
  },
  total: 10,
  status: "pending" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  deliveryMethod: DeliveryMethod.Shipping,
};

describe("buildOrderConfirmationEmail escaping", () => {
  it("escapes user-controlled values in html", () => {
    const { html } = buildOrderConfirmationEmail(base);
    for (const raw of [evil, 'a"b', "<s>", "<c>", "<e@x.com>", "<p>", "<addr>", "<city>", "<zip>", "<b>1</b>"]) {
      expect(html).not.toContain(raw);
    }
    expect(html).toContain("&lt;img onerror=1&gt;");
    expect(html).toContain("a&quot;b");
  });

  it("escapes meetup location", () => {
    const { html } = buildOrderConfirmationEmail({ ...base, deliveryMethod: DeliveryMethod.Meetup });
    expect(html).not.toContain("<meet>");
  });

  it("escapes and quotes the logo url attribute", () => {
    process.env.NEXT_PUBLIC_LOGO_URL = 'http://x/a.png" onerror="1';
    const { html } = buildOrderConfirmationEmail(base);
    expect(html).not.toContain('" onerror="1');
    expect(html).toContain('src="http://x/a.png&quot; onerror=&quot;1"');
  });

  it("keeps plain-text delivery info unescaped", () => {
    const b = { ...base, deliveryMethod: DeliveryMethod.Meetup, customer: { ...base.customer, meetupLocation: "A & B" } };
    const { html, text } = buildOrderConfirmationEmail(b);
    expect(text).toContain("A & B");
    expect(text).not.toContain("&amp;");
    expect(html).toContain("A &amp; B");
  });

  it("omits the logo img when NEXT_PUBLIC_LOGO_URL is empty", () => {
    process.env.NEXT_PUBLIC_LOGO_URL = "";
    expect(buildOrderConfirmationEmail(base).html).not.toContain("<img");
  });
});
