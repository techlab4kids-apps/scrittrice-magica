// FIX: Implement and export the imageUrlToBase64 function.
// The previous content of this file was incorrect and caused an import error.
/**
 * Converts an image URL to a base64 string and its MIME type.
 * Handles both remote URLs and data URLs.
 * @param url The URL of the image to convert.
 * @returns A promise resolving to an object with base64 data and mimeType.
 */
export const imageUrlToBase64 = async (
  url: string,
): Promise<{ base64: string; mimeType: string }> => {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const base64 = parts[1];
    return { base64, mimeType };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${url}. Status: ${response.statusText}`);
  }
  const blob = await response.blob();
  const mimeType = blob.type;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result is "data:mime/type;base64,..."
      const base64String = (reader.result as string).split(',')[1];
      resolve({ base64: base64String, mimeType });
    };
    reader.onerror = (error) => {
      reject(new Error(`Failed to read blob as data URL: ${error}`));
    };
    reader.readAsDataURL(blob);
  });
};
