import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Product, PricingRule } from './types';

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'prod_document', name: 'Quick Document Print', basePrice: 5.0, active: true, config: { sizes: ['A4', 'A3', 'A5'], stocks: ['80gsm', '90gsm', '120gsm'], finishes: ['Uncoated'] } },
  { id: 'prod_flyer', name: 'Flyers', basePrice: 250.0, active: true, config: { sizes: ['A5', 'A4'], stocks: ['80gsm', '90gsm', '120gsm', '150gsm'], finishes: ['Uncoated', 'Gloss laminate'] } },
  { id: 'prod_brochure', name: 'Brochures', basePrice: 380.0, active: true, config: { sizes: ['A4', 'A3'], stocks: ['120gsm', '150gsm', '170gsm'], finishes: ['Uncoated', 'Gloss laminate', 'Matt laminate'] } },
  { id: 'prod_banner', name: 'Banners', basePrice: 450.0, active: true, config: { sizes: ['custom', 'A1', 'A2'], stocks: ['350gsm'], finishes: ['Uncoated'] } },
  { id: 'prod_poster', name: 'Posters', basePrice: 190.0, active: true, config: { sizes: ['A2', 'A1', 'A0'], stocks: ['150gsm', '170gsm', '250gsm'], finishes: ['Uncoated', 'Gloss laminate', 'Matt laminate'] } },
  { id: 'prod_letterhead', name: 'Letterheads', basePrice: 220.0, active: true, config: { sizes: ['A4'], stocks: ['80gsm', '90gsm', '120gsm'], finishes: ['Uncoated'] } },
  { id: 'prod_ncrbook', name: 'NCR Books', basePrice: 280.0, active: true, config: { sizes: ['A4', 'A5'], stocks: ['80gsm'], finishes: ['Uncoated'] } },
  { id: 'prod_custom', name: 'Custom Prints', basePrice: 100.0, active: true, config: { sizes: ['A4', 'A5', 'A6', 'A3', 'A2', 'A1', 'custom'], stocks: ['80gsm', '90gsm', '120gsm', '150gsm', '170gsm', '250gsm', '300gsm', '350gsm'], finishes: ['Uncoated', 'Gloss laminate', 'Matt laminate', 'Soft touch', 'UV spot'] } }
];

export const DEFAULT_PRICING_RULES: PricingRule[] = [
  // Paper stock
  { id: 'rule_stock_80', productId: 'global', ruleType: 'paper_stock', key: '80gsm', multiplier: 1.0 },
  { id: 'rule_stock_90', productId: 'global', ruleType: 'paper_stock', key: '90gsm', multiplier: 1.05 },
  { id: 'rule_stock_120', productId: 'global', ruleType: 'paper_stock', key: '120gsm', multiplier: 1.15 },
  { id: 'rule_stock_150', productId: 'global', ruleType: 'paper_stock', key: '150gsm', multiplier: 1.25 },
  { id: 'rule_stock_170', productId: 'global', ruleType: 'paper_stock', key: '170gsm', multiplier: 1.35 },
  { id: 'rule_stock_250', productId: 'global', ruleType: 'paper_stock', key: '250gsm', multiplier: 1.5 },
  { id: 'rule_stock_300', productId: 'global', ruleType: 'paper_stock', key: '300gsm', multiplier: 1.65 },
  { id: 'rule_stock_350', productId: 'global', ruleType: 'paper_stock', key: '350gsm', multiplier: 1.8 },

  // Finishes
  { id: 'rule_finish_uncoated', productId: 'global', ruleType: 'finish', key: 'Uncoated', multiplier: 1.0 },
  { id: 'rule_finish_gloss', productId: 'global', ruleType: 'finish', key: 'Gloss laminate', multiplier: 1.2 },
  { id: 'rule_finish_matt', productId: 'global', ruleType: 'finish', key: 'Matt laminate', multiplier: 1.25 },
  { id: 'rule_finish_soft', productId: 'global', ruleType: 'finish', key: 'Soft touch', multiplier: 1.4 },
  { id: 'rule_finish_uv', productId: 'global', ruleType: 'finish', key: 'UV spot', multiplier: 1.5 },

  // Turnaround
  { id: 'rule_turn_standard', productId: 'global', ruleType: 'turnaround', key: 'Standard (3–5 days)', multiplier: 1.0 },
  { id: 'rule_turn_express', productId: 'global', ruleType: 'turnaround', key: 'Express (next day)', multiplier: 1.5 },
  { id: 'rule_turn_sameday', productId: 'global', ruleType: 'turnaround', key: 'Same day (premium)', multiplier: 2.0 }
];

export async function seedDatabaseIfEmpty() {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      console.log('Seeding products catalog...');
      const batch = writeBatch(db);
      
      DEFAULT_PRODUCTS.forEach((p) => {
        const docRef = doc(db, 'products', p.id);
        batch.set(docRef, p);
      });

      DEFAULT_PRICING_RULES.forEach((r) => {
        const docRef = doc(db, 'pricing_rules', r.id);
        batch.set(docRef, r);
      });

      await batch.commit();
      console.log('Seeding completed successfully!');
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
