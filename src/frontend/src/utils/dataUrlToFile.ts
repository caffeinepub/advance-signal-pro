/**
 * Converts a data URL string to a File object.
 * Returns null if the data URL is missing, empty, or malformed.
 * Never throws — all errors are caught and return null.
 */
export function dataUrlToFile(
  dataUrl: string | null | undefined,
  filename: string,
): File | null {
  try {
    // Validate input
    if (!dataUrl || typeof dataUrl !== "string") return null;
    if (!dataUrl.startsWith("data:")) return null;

    // Extract MIME type — support both base64 and plain data URLs
    let mimeType = "image/jpeg";
    let base64Data: string;

    const base64Marker = ";base64,";
    const base64Index = dataUrl.indexOf(base64Marker);

    if (base64Index !== -1) {
      // Standard base64 data URL: data:<mime>;base64,<data>
      const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
      if (mimeMatch?.[1]) {
        mimeType = mimeMatch[1];
      }
      base64Data = dataUrl.slice(base64Index + base64Marker.length);
    } else {
      // Non-base64 data URL — not supported for File conversion
      return null;
    }

    if (!base64Data || base64Data.length === 0) return null;

    // Decode base64 to binary
    let binaryString: string;
    try {
      binaryString = atob(base64Data);
    } catch {
      // Invalid base64
      return null;
    }

    if (!binaryString || binaryString.length === 0) return null;

    // Convert to Uint8Array
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }

    if (byteArray.length === 0) return null;

    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  } catch {
    return null;
  }
}
