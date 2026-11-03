export type ProductPhoto = { url: string; sourceUrl: string };
export type ProductPhotoResult = {
  images: ProductPhoto[];
  retryAfter?: number;
};
