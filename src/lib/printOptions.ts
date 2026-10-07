/** Paper stock labels and size-dependent availability (PNX Rondebosch). */

export const SMALL_FORMAT_SIZES = ['A6', 'A5', 'A4', 'A3'] as const;
export const LARGE_FORMAT_SIZES = ['A2', 'A1', 'A0'] as const;

export const SMALL_FORMAT_STOCKS = [
  '80gr bond paper',
  '180gsm Matt',
  '180gsm Gloss',
  '300gsm Matt',
  '300gsm Gloss',
] as const;

export const LARGE_FORMAT_STOCKS = [
  '80gr bond paper',
  '170gsm Matt',
  '170gsm Gloss',
] as const;

export const BINDING_OPTIONS = [
  'None',
  'Plastic Ring Binding',
  'Wire Binding',
  'Glue Binding',
] as const;

export type BindingOption = (typeof BINDING_OPTIONS)[number];

export function isLargeFormatSize(sizeCode: string): boolean {
  return (LARGE_FORMAT_SIZES as readonly string[]).includes(sizeCode);
}

export function paperStocksForSize(sizeCode: string): readonly string[] {
  return isLargeFormatSize(sizeCode) ? LARGE_FORMAT_STOCKS : SMALL_FORMAT_STOCKS;
}

export function defaultStockForSize(sizeCode: string): string {
  return paperStocksForSize(sizeCode)[0];
}

export function normalizePaperSizeFromLabel(sz: string): string {
  return sz.split(' ')[0];
}

export function weightMultiplier(stock: string): number {
  if (stock.includes('80gr')) return 1.0;
  if (stock.includes('170gsm')) return 1.25;
  if (stock.includes('180gsm')) return 1.35;
  if (stock.includes('300gsm')) return 1.65;
  return 1.0;
}

export function bindingMultiplier(binding: string): number {
  switch (binding) {
    case 'Plastic Ring Binding':
      return 1.45;
    case 'Wire Binding':
      return 1.55;
    case 'Glue Binding':
      return 1.65;
    default:
      return 1.0;
  }
}

export function sizeOptionsForProduct(product: 'document' | 'poster' | 'flyer' | 'booklet'): string[] {
  if (product === 'poster') {
    return ['A2 (420 x 594 mm)', 'A1 (594 x 841 mm)', 'A0 (841 x 1189 mm)', 'A3 (297 x 420 mm)'];
  }
  if (product === 'flyer') {
    return ['A6 (105 x 148 mm)', 'A5 (148 x 210 mm)', 'A4 (210 x 297 mm)', 'A3 (297 x 420 mm)'];
  }
  return ['A4 (210 x 297 mm)', 'A5 (148 x 210 mm)', 'A6 (105 x 148 mm)', 'A3 (297 x 420 mm)'];
}

export function bindingOptionsForProduct(product: 'document' | 'poster' | 'flyer' | 'booklet'): BindingOption[] {
  if (product === 'poster' || product === 'flyer') {
    return ['None'];
  }
  return [...BINDING_OPTIONS];
}

export const MAX_COPY_QUANTITY = 9999;
