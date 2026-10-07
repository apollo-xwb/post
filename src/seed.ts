import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './App';
import { SMALL_FORMAT_STOCKS, LARGE_FORMAT_STOCKS, BINDING_OPTIONS } from './lib/printOptions';

export async function seedDatabase() {
  try {
    const checkDoc = await getDoc(doc(db, 'products', 'prod_document'));
    if (checkDoc.exists()) {
      console.log('Database already seeded with products.');
      return;
    }

    console.log('Seeding products and pricing rules to Firestore...');
    const batch = writeBatch(db);

    const products = [
      {
        id: 'prod_document',
        name: 'Documents & Manuscripts',
        basePrice: 1.50,
        active: true,
        config: {
          sizes: ['A4', 'A5', 'A6', 'A3'],
          paperStocksSmall: [...SMALL_FORMAT_STOCKS],
          paperStocksLarge: [...LARGE_FORMAT_STOCKS],
          binding: [...BINDING_OPTIONS],
        },
      },
      {
        id: 'prod_poster',
        name: 'High-Gloss Posters',
        basePrice: 45.00,
        active: true,
        config: {
          sizes: ['A3', 'A2', 'A1', 'A0'],
          paperStocksSmall: [...SMALL_FORMAT_STOCKS],
          paperStocksLarge: [...LARGE_FORMAT_STOCKS],
        },
      },
      {
        id: 'prod_flyer',
        name: 'Marketing Flyers',
        basePrice: 2.20,
        active: true,
        config: {
          sizes: ['A6', 'A5', 'A4', 'A3'],
          paperStocksSmall: [...SMALL_FORMAT_STOCKS],
        },
      },
      {
        id: 'prod_booklet',
        name: 'Bound Booklets',
        basePrice: 12.50,
        active: true,
        config: {
          sizes: ['A4', 'A5', 'A6', 'A3'],
          paperStocksSmall: [...SMALL_FORMAT_STOCKS],
          binding: [...BINDING_OPTIONS],
        },
      },
    ];

    for (const p of products) {
      batch.set(doc(db, 'products', p.id), p);
    }

    const stockRules = [
      ...SMALL_FORMAT_STOCKS.map((key, i) => ({
        id: `rule_stock_small_${i}`,
        productId: 'all',
        ruleType: 'paper_stock' as const,
        key,
        multiplier: key.includes('80gr') ? 1.0 : key.includes('180gsm') ? 1.35 : 1.65,
      })),
      ...LARGE_FORMAT_STOCKS.map((key, i) => ({
        id: `rule_stock_large_${i}`,
        productId: 'all',
        ruleType: 'paper_stock' as const,
        key,
        multiplier: key.includes('80gr') ? 1.0 : 1.25,
      })),
    ];

    const bindingRules = BINDING_OPTIONS.map((key) => ({
      id: `rule_bind_${key.replace(/\s+/g, '_').toLowerCase()}`,
      productId: 'all',
      ruleType: 'finish' as const,
      key,
      multiplier:
        key === 'None' ? 1.0 : key === 'Plastic Ring Binding' ? 1.45 : key === 'Wire Binding' ? 1.55 : 1.65,
    }));

    const rules = [
      ...stockRules,
      ...bindingRules,
      { id: 'rule_turn_std', productId: 'all', ruleType: 'turnaround', key: 'standard', multiplier: 1.0 },
    ];

    for (const r of rules) {
      batch.set(doc(db, 'pricing_rules', r.id), r);
    }

    batch.set(doc(db, 'config', 'seed_marker'), { seeded: true, timestamp: new Date() });

    await batch.commit();
    console.log('Firestore Database successfully seeded.');
  } catch (error) {
    console.error('Failed to seed Firestore database:', error);
  }
}
