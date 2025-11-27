import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/escape-html";

describe("escapeHtml", () => {
  it("escapes & < > \" '", () => {
    const out = escapeHtml(`<script>"x"</script>&'`);
    expect(out).not.toMatch(/[<>"']/);
    expect(out).toBe("&lt;script&gt;&quot;x&quot;&lt;/script&gt;&amp;&#39;");
  });
});
