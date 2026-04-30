import { useState, useCallback } from 'react';

export interface OCRResult {
  latex: string;
  confidence: 'high' | 'medium' | 'low';
  raw: string;
}

export function useOCR() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractLatex = useCallback(async (file: File): Promise<OCRResult | null> => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported for OCR');
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          resolve(dataUrl.split(',')[1]); // strip data:image/...;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mediaType: file.type,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'OCR failed');
      }

      const data: OCRResult = await res.json();
      setResult(data);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { extractLatex, loading, result, error };
}
