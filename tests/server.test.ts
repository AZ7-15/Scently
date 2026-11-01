import { describe, it, expect, vi } from "vitest";
const auth = vi.hoisted(() => ({
  user: null as null | { userId: string; fullName: string },
}));
vi.mock("@/lib/server/session", () => ({
  getSessionUser: async () => auth.user,
}));
import * as reviewApi from "../app/api/reviews/route";
import { POST as collection } from "../app/api/collection/route";
import { POST as admin } from "../app/api/admin/route";
import { getCatalog, getReviews } from "../lib/server/catalog";
import { curatedCatalog } from "../data/catalog";
function request(body: unknown, method = "POST") {
  return new Request("https://test.local/api", {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://test.local",
    },
    body: JSON.stringify(body),
  });
}
describe("Database-backed authorization and moderation", () => {
  it("enforces ownership, deduplicates votes, moderates and audits changes", async () => {
    await getCatalog();
    expect((await reviewApi.POST(request({}))).status).toBe(401);
    auth.user = { userId: "alice", fullName: "Alice" };
    const body = {
      fragranceId: "sauvage-edp",
      rating: 4,
      content: "A test-only experience stored in an isolated SQLite database.",
      longevity: 7,
      projection: "strong",
    };
    expect((await reviewApi.POST(request(body))).status).toBe(201);
    const [review] = await getReviews("alice", "sauvage-edp");
    expect((await reviewApi.POST(request({ ...body, rating: 5 }))).status).toBe(
      200,
    );
    expect(await getReviews("alice", "sauvage-edp")).toHaveLength(1);
    expect(
      (
        await reviewApi.PATCH(
          request({ id: review.id, action: "helpful" }, "PATCH"),
        )
      ).status,
    ).toBe(400);
    auth.user = { userId: "bob", fullName: "Bob" };
    expect(
      (await reviewApi.DELETE(request({ id: review.id }, "DELETE"))).status,
    ).toBe(403);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await reviewApi.PATCH(
            request({ id: review.id, action: "helpful" }, "PATCH"),
          )
        ).status,
      ).toBe(200);
    expect((await getReviews("bob", "sauvage-edp"))[0].helpful).toBe(1);
    expect(
      (
        await reviewApi.PATCH(
          request(
            {
              id: review.id,
              action: "report",
              reason: "Test moderation report",
            },
            "PATCH",
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await admin(
          request({ action: "moderate", id: review.id, status: "hidden" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await collection(
          request({ fragranceId: "sauvage-edp", status: "wishlist" }),
        )
      ).status,
    ).toBe(200);
    auth.user = { userId: "test-admin", fullName: "Administrator" };
    expect(
      (
        await admin(
          request({ action: "moderate", id: review.id, status: "hidden" }),
        )
      ).status,
    ).toBe(200);
    expect(await getReviews(undefined, "sauvage-edp")).toHaveLength(0);
    expect(
      (await getCatalog()).find((f) => f.id === "sauvage-edp")?.rating,
    ).toBeNull();
    const modified = {
      ...curatedCatalog[0],
      description: "An explicitly reviewed correction for this isolated test.",
    };
    expect(
      (
        await admin(
          request({ action: "fragrance", record: modified, overwrite: false }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await admin(
          request({ action: "fragrance", record: modified, overwrite: true }),
        )
      ).status,
    ).toBe(200);
    expect(
      (await getCatalog()).find((f) => f.id === "sauvage-edp")?.description,
    ).toBe(modified.description);
    auth.user = { userId: "alice", fullName: "Alice" };
    await reviewApi.DELETE(request({ id: review.id }, "DELETE"));
    expect(await getReviews("alice", "sauvage-edp")).toHaveLength(0);
  });
});
