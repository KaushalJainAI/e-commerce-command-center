/** Client-side image quality guard for product/category uploads.
 *
 * Non-technical admins often upload tiny WhatsApp thumbnails that look blurry
 * on the storefront. We block truly unusable images and warn on small ones,
 * in plain language.
 */
export interface ImageCheckResult {
  ok: boolean;          // false = block the upload
  warning?: string;     // set when the image is usable but not great
  error?: string;       // set when ok === false
}

const MIN_BLOCK_PX = 300;  // below this the image is unusable
const MIN_WARN_PX = 800;   // below this it may look blurry on product pages

export const checkImageFile = (file: File): Promise<ImageCheckResult> =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ ok: false, error: 'That file is not an image. Please choose a photo (JPG or PNG).' });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const smallest = Math.min(img.width, img.height);
      if (smallest < MIN_BLOCK_PX) {
        resolve({
          ok: false,
          error: `This photo is too small (${img.width}×${img.height}) and will look blurry. Please use a bigger photo — at least ${MIN_WARN_PX}px wide.`,
        });
      } else if (smallest < MIN_WARN_PX) {
        resolve({
          ok: true,
          warning: `This photo is a bit small (${img.width}×${img.height}) and may look soft on big screens. A photo at least ${MIN_WARN_PX}px wide would look better.`,
        });
      } else {
        resolve({ ok: true });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, error: 'Could not read this image file. Please try a different photo.' });
    };
    img.src = url;
  });
