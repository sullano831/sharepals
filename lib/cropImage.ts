/** Pixel crop area (x, y, width, height) */
type Area = { x: number; y: number; width: number; height: number };

/**
 * Load an image from URL and return it as an HTMLImageElement.
 * Do NOT set crossOrigin for blob:/object URLs — it taints the canvas and produces a black image.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const isBlobOrData = url.startsWith("blob:") || url.startsWith("data:");
    if (!isBlobOrData) img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Failed to load image")));
    img.src = url;
  });
}

/**
 * Returns a default center-square crop area for an image (for when crop UI hasn't provided one yet).
 */
export async function getDefaultCenterCrop(imageUrl: string): Promise<Area> {
  const img = await loadImage(imageUrl);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) throw new Error("Image has no dimensions");
  const side = Math.min(nw, nh);
  const x = (nw - side) / 2;
  const y = (nh - side) / 2;
  return { x, y, width: side, height: side };
}

/**
 * Clamp crop area to image bounds and ensure valid dimensions.
 */
function clampCrop(
  crop: Area,
  imgWidth: number,
  imgHeight: number
): Area {
  const w = Math.min(Math.max(1, crop.width), imgWidth);
  const h = Math.min(Math.max(1, crop.height), imgHeight);
  const x = Math.max(0, Math.min(crop.x, imgWidth - w));
  const y = Math.max(0, Math.min(crop.y, imgHeight - h));
  return { x, y, width: w, height: h };
}

/**
 * Returns a circular-cropped image as a JPEG Blob.
 * Uses the crop area (in original image pixels) and draws it into a circular output.
 */
export async function getCroppedCircleBlob(
  imageUrl: string,
  pixelCrop: Area,
  size = 400
): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) throw new Error("Image has no dimensions");

  const crop = clampCrop(pixelCrop, nw, nh);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const radius = size / 2;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}
