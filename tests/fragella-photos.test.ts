import { expect, it } from "vitest";
import { photosFromFragella } from "../lib/server/fragella-photos";

const sourceUrl = "https://api.fragella.com/";
const standard = "https://cdn.fragella.com/images/kilian-angels-share.jpg";
const transparent = "https://cdn.fragella.com/images/kilian-angels-share.webp";
const product = {
  Name: "Kilian Angels' Share",
  Brand: "By Kilian",
  OilType: "Eau de Parfum",
  "Image URL": standard,
  "Image URL Transparent": transparent,
};

it("uses exact brand, edition and concentration with a matching transparent bottle", () => {
  expect(photosFromFragella([product], "Angels' Share", "Kilian Paris", "Eau de Parfum")).toEqual([
    { url: transparent, sourceUrl },
    { url: standard, sourceUrl },
  ]);
  expect(photosFromFragella([product], "Angels' Share Paradis", "Kilian Paris", "Eau de Parfum")).toEqual([]);
  expect(photosFromFragella([product], "Angels' Share", "Kilian Paris", "Eau de Toilette")).toEqual([]);
  expect(photosFromFragella([product], "Angels' Share", "Creed", "Eau de Parfum")).toEqual([]);
});

it("rejects an unrelated transparent image and an untrusted image host", () => {
  expect(photosFromFragella({ data: [{ ...product, "Image URL Transparent": "https://cdn.fragella.com/images/another-scent.webp" }] }, "Angels' Share", "Kilian Paris", "Eau de Parfum")).toEqual([
    { url: standard, sourceUrl },
  ]);
  expect(photosFromFragella([{ ...product, "Image URL": "https://example.com/bottle.jpg" }], "Angels' Share", "Kilian Paris", "Eau de Parfum")).toEqual([]);
});

it("uses the standard bottle if the transparent image fails", () => {
  expect(photosFromFragella([product], "Angels' Share", "Kilian Paris", "Eau de Parfum", [transparent])).toEqual([
    { url: standard, sourceUrl },
  ]);
});
