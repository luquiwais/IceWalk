type OpticalField = { width: number; height: number; pixels: Uint8ClampedArray };

/** Signed-distance normal field for a rounded glass edge, generated once.
 * The interior is exactly neutral; only the bounded edge band refracts.
 * This is an explicit web optical model, not Apple's private material shader.
 */
function opticalField(width: number, height: number, radius: number, band = 16): OpticalField {
  if (![width, height, radius, band].every(Number.isFinite) || width <= 0 || height <= 0 || radius < 0 || band <= 0)
    throw new RangeError("Optical fields need finite positive dimensions");
  const ratio = Math.min(1, 384 / width, 256 / height);
  const w = Math.max(1, Math.ceil(width * ratio)), h = Math.max(1, Math.ceil(height * ratio));
  const pixels = new Uint8ClampedArray(w * h * 4);
  const r = Math.min(radius, width / 2, height / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = (x + .5) / w * width - width / 2;
    const py = (y + .5) / h * height - height / 2;
    const qx = Math.abs(px) - width / 2 + r, qy = Math.abs(py) - height / 2 + r;
    const outside = Math.hypot(Math.max(0, qx), Math.max(0, qy));
    const distance = -(outside + Math.min(Math.max(qx, qy), 0) - r);
    let nx = 0, ny = 0;
    if (outside) { nx = Math.max(0, qx) / outside * Math.sign(px); ny = Math.max(0, qy) / outside * Math.sign(py); }
    else if (qx > qy) nx = Math.sign(px);
    else ny = Math.sign(py);
    const bend = distance > 0 && distance < band ? Math.sin(Math.PI * distance / band) : 0;
    const i = (y * w + x) * 4;
    pixels[i] = Math.round(128 + nx * bend * 126);
    pixels[i + 1] = Math.round(128 + ny * bend * 126);
    pixels[i + 2] = 128; pixels[i + 3] = 255;
  }
  return { width: w, height: h, pixels };
}

export { opticalField };
export type { OpticalField };
