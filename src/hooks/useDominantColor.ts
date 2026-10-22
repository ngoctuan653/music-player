import { useState, useEffect } from 'react';

export interface ExtractedColors {
  hex: string;
  rgb: string;
  vinylColor: string;
  vinylTranslucentBg: string;
  vinylSheenColor: string;
  labelBg: string;
  glowColor: string;
  ambientLight: string;
  isFallback: boolean;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const DEFAULT_NEUTRAL_COLORS: ExtractedColors = {
  hex: '#2b2e38',
  rgb: 'rgb(43, 46, 56)',
  vinylColor: 'rgba(45, 48, 60, 0.88)',
  vinylTranslucentBg: 'radial-gradient(circle at 50% 50%, rgba(55, 60, 75, 0.85) 0%, rgba(36, 40, 50, 0.88) 55%, rgba(18, 20, 26, 0.95) 100%)',
  vinylSheenColor: 'rgba(180, 185, 205, 0.45)',
  labelBg: '#121418',
  glowColor: 'rgba(50, 56, 72, 0.30)',
  ambientLight: 'rgba(40, 45, 60, 0.18)',
  isFallback: true,
};

const colorCache = new Map<string, ExtractedColors>();

export function useDominantColor(imageUrl?: string): { colors: ExtractedColors; isLoaded: boolean } {
  const [colors, setColors] = useState<ExtractedColors>(() => {
    if (imageUrl && colorCache.has(imageUrl)) {
      return colorCache.get(imageUrl)!;
    }
    return DEFAULT_NEUTRAL_COLORS;
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setColors(DEFAULT_NEUTRAL_COLORS);
      setIsLoaded(true);
      return;
    }

    if (colorCache.has(imageUrl)) {
      setColors(colorCache.get(imageUrl)!);
      setIsLoaded(true);
      return;
    }

    let isCancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isCancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setColors(DEFAULT_NEUTRAL_COLORS);
          setIsLoaded(true);
          return;
        }

        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;

        // 12 Hue Sectors (30° each):
        // 0: Reds (345°-15°), 1: Orange, 2: Amber/Yellow, 3: Lime, 4: Green, 5: Teal,
        // 6: Cyan, 7: Sky Blue, 8: Royal Blue, 9: Violet, 10: Purple/Magenta, 11: Pink/Rose
        const bucketScores = new Float64Array(12);
        const bucketR = new Float64Array(12);
        const bucketG = new Float64Array(12);
        const bucketB = new Float64Array(12);
        const bucketCounts = new Int32Array(12);

        let neutralR = 0;
        let neutralG = 0;
        let neutralB = 0;
        let neutralCount = 0;

        // Scan full 16:9 artwork area: rows y = 3 to 28 (skips YouTube letterbox bands)
        for (let y = 3; y <= 28; y++) {
          for (let x = 0; x < 32; x++) {
            const idx = (y * 32 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 128) continue;

            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            // Reject extreme pitch black and blown-out pure white
            if (lum < 16 || lum > 242) continue;

            const [h, s, l] = rgbToHsl(r, g, b);

            // Neutral/grey pixels: record for monochrome palette fallback
            if (s < 0.15) {
              neutralR += r;
              neutralG += g;
              neutralB += b;
              neutralCount++;
              continue;
            }

            // Chromatic pixels: bin into 12 hue sectors
            const shiftedH = ((h + 15) % 360 + 360) % 360;
            const bIdx = Math.floor(shiftedH / 30);

            // Weight favors high saturation and rich midtones
            const satWeight = 1 + s * 3.2;
            const lumWeight = 1 - Math.abs(l - 0.48) * 1.1;
            const weight = Math.max(0.1, satWeight * Math.max(0.2, lumWeight));

            bucketScores[bIdx] += weight;
            bucketR[bIdx] += r * weight;
            bucketG[bIdx] += g * weight;
            bucketB[bIdx] += b * weight;
            bucketCounts[bIdx]++;
          }
        }

        // Find the signature chromatic color bucket
        let bestBucket = -1;
        let maxScore = 0;

        for (let i = 0; i < 12; i++) {
          if (bucketCounts[i] >= 4 && bucketScores[i] > maxScore) {
            maxScore = bucketScores[i];
            bestBucket = i;
          }
        }

        let resinR: number;
        let resinG: number;
        let resinB: number;
        let isNeutralTheme = false;

        if (bestBucket !== -1 && maxScore >= 8) {
          // Signature chromatic theme from artwork (e.g. Red suits, Teal ocean, Neon lights)
          const rawR = Math.round(bucketR[bestBucket] / bucketScores[bestBucket]);
          const rawG = Math.round(bucketG[bestBucket] / bucketScores[bestBucket]);
          const rawB = Math.round(bucketB[bestBucket] / bucketScores[bestBucket]);

          let [h, s, l] = rgbToHsl(rawR, rawG, rawB);

          // Enhance saturation tastefully (never washed out, but rich colored resin)
          s = Math.max(0.55, Math.min(0.92, s * 1.25));
          // Keep luminance in the deep translucent resin range
          l = Math.max(0.34, Math.min(0.50, l));

          [resinR, resinG, resinB] = hslToRgb(h, s, l);
        } else {
          // Truly neutral / monochrome album:
          // Generate elegant Smoky Obsidian Slate palette (never forced yellow!)
          isNeutralTheme = true;
          let r = neutralCount > 0 ? Math.round(neutralR / neutralCount) : 42;
          let g = neutralCount > 0 ? Math.round(neutralG / neutralCount) : 45;
          let b = neutralCount > 0 ? Math.round(neutralB / neutralCount) : 55;

          const maxC = Math.max(r, g, b);
          if (maxC > 85) {
            const factor = 75 / maxC;
            r = Math.round(r * factor);
            g = Math.round(g * factor);
            b = Math.round(b * factor);
          } else if (maxC < 30) {
            r = Math.max(32, r + 16);
            g = Math.max(35, g + 17);
            b = Math.max(45, b + 22);
          }
          // Subtle cool slate tone
          b = Math.min(255, b + 8);
          resinR = r;
          resinG = g;
          resinB = b;
        }

        const toHex = (c: number) => c.toString(16).padStart(2, '0');
        const hex = `#${toHex(resinR)}${toHex(resinG)}${toHex(resinB)}`;
        const rgb = `rgb(${resinR}, ${resinG}, ${resinB})`;

        const vinylColor = `rgba(${resinR}, ${resinG}, ${resinB}, 0.88)`;
        const midR = Math.round(resinR * 0.85);
        const midG = Math.round(resinG * 0.85);
        const midB = Math.round(resinB * 0.85);
        const rimR = Math.max(12, Math.round(resinR * 0.38));
        const rimG = Math.max(10, Math.round(resinG * 0.38));
        const rimB = Math.max(8, Math.round(resinB * 0.38));

        const vinylTranslucentBg = `radial-gradient(circle at 50% 50%, rgba(${resinR}, ${resinG}, ${resinB}, 0.82) 0%, rgba(${midR}, ${midG}, ${midB}, 0.86) 55%, rgba(${rimR}, ${rimG}, ${rimB}, 0.94) 100%)`;
        const vinylSheenColor = isNeutralTheme
          ? 'rgba(180, 185, 205, 0.45)'
          : `rgba(${Math.min(255, resinR + 40)}, ${Math.min(255, resinG + 40)}, ${Math.min(255, resinB + 40)}, 0.45)`;
        const labelBg = `rgb(${rimR}, ${rimG}, ${rimB})`;
        const glowColor = `rgba(${resinR}, ${resinG}, ${resinB}, 0.30)`;
        const ambientLight = `rgba(${resinR}, ${resinG}, ${resinB}, 0.18)`;

        const extracted: ExtractedColors = {
          hex,
          rgb,
          vinylColor,
          vinylTranslucentBg,
          vinylSheenColor,
          labelBg,
          glowColor,
          ambientLight,
          isFallback: false,
        };

        colorCache.set(imageUrl, extracted);
        setColors(extracted);
        setIsLoaded(true);
      } catch (err) {
        // Fallback to elegant neutral smoky slate
        colorCache.set(imageUrl, DEFAULT_NEUTRAL_COLORS);
        setColors(DEFAULT_NEUTRAL_COLORS);
        setIsLoaded(true);
      }
    };

    img.onerror = () => {
      if (isCancelled) return;
      colorCache.set(imageUrl, DEFAULT_NEUTRAL_COLORS);
      setColors(DEFAULT_NEUTRAL_COLORS);
      setIsLoaded(true);
    };

    img.src = imageUrl;

    return () => {
      isCancelled = true;
    };
  }, [imageUrl]);

  return { colors, isLoaded };
}
