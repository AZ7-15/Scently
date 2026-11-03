import { expect, it, vi, beforeEach } from "vitest";
vi.mock("../lib/server/fragrance-editorial", () => ({ sourceMarkup: vi.fn() }));
import { sourceMarkup } from "../lib/server/fragrance-editorial";
import { GET } from "../app/api/notes/portrait/route";
beforeEach(() => vi.mocked(sourceMarkup).mockReset());
it("uses only the matching note portrait and retains its source", async () => {
  vi.mocked(sourceMarkup).mockResolvedValue(
    '<img fetchPriority="high" src="/_next/image?url=https%3A%2F%2Fimagedelivery.net%2Faccount%2Ftonka_bean%2Fpublic&amp;w=128">',
  );
  const response = await GET(
    new Request("https://scently.test/api/notes/portrait?name=Tonka+Bean"),
  );
  expect(await response.json()).toMatchObject({
    imageUrl: "https://imagedelivery.net/account/tonka_bean/public",
    sourceUrl: "https://www.scento.com/note/tonka-bean",
  });
});
it("does not substitute product pictures, other ingredients or untrusted hosts", async () => {
  for (const url of [
    "https://imagedelivery.net/account/rose/public",
    "https://imagedelivery.net/account/perfume/public",
    "https://untrusted.example/account/lavender/public",
  ]) {
    vi.mocked(sourceMarkup).mockResolvedValue(
      '<img fetchPriority="high" src="' + url + '">',
    );
    const response = await GET(
      new Request("https://scently.test/api/notes/portrait?name=Lavender"),
    );
    expect(await response.json()).toMatchObject({ imageUrl: null });
  }
});
it("rejects invalid note requests before fetching upstream", async () => {
  const response = await GET(
    new Request("https://scently.test/api/notes/portrait"),
  );
  expect(response.status).toBe(400);
  expect(sourceMarkup).not.toHaveBeenCalled();
});
