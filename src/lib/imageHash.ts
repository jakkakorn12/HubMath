// perceptual hash (dHash) ของรูปภาพ — เทียบว่า "ภาพหน้าตาเหมือนกันไหม"
// ทนต่อการบีบอัด/ย่อขนาด/ส่งต่อผ่านแอปแชท (ต่างจาก content_hash ที่เทียบทุกไบต์)

// คำนวณจาก File → hex 16 ตัว (64 บิต) หรือ null ถ้าไม่ใช่รูป/ทำไม่ได้
export async function imageDHash(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const w = 9, h = 8; // dHash: เทียบพิกเซลข้างกันในแนวนอน → 8x8=64 บิต
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const gray: number[] = [];
    for (let i = 0; i < w * h; i++) {
      gray.push(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
    }

    let bits = "";
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w - 1; x++) {
        bits += gray[y * w + x] < gray[y * w + x + 1] ? "1" : "0";
      }
    }

    let hex = "";
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

// ระยะห่างของลายนิ้วมือ (0 = เหมือนกันทุกบิต, 64 = ต่างหมด)
export function imageHammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}

// ต่างกันไม่เกินนี้ = น่าจะเป็นภาพเดียวกัน (เข้มไว้ก่อน กัน false positive)
export const IMAGE_HASH_THRESHOLD = 6;
