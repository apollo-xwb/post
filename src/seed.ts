import { doc, setDoc, getDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from './App';

export async function seedDatabase() {
  try {
    // Check if seeding has already been done
    const checkDoc = await getDoc(doc(db, 'products', 'prod_document'));
    if (checkDoc.exists()) {
      console.log('Database already seeded with products.');
      return;
    }

    console.log('Seeding products and pricing rules to Firestore...');
    const batch = writeBatch(db);

    // 1. Products
    const products = [
      {
        id: 'prod_document',
        name: 'Documents & Manuscripts',
        basePrice: 1.50, // 1.50 ZAR per page standard
        active: true,
        config: {
          sizes: ['A4', 'A5', 'letter']
        }
      },
      {
        id: 'prod_poster',
        name: 'High-Gloss Posters',
        basePrice: 45.00, // 45.00 ZAR base
        active: true,
        config: {
          sizes: ['A3', 'A2', 'A1', 'A0']
        }
      },
      {
        id: 'prod_flyer',
        name: 'Marketing Flyers',
        basePrice: 2.20, // 2.20 ZAR base
        active: true,
        config: {
          sizes: ['A4', 'A5', 'A6']
        }
      },
      {
        id: 'prod_bizcard',
        name: 'Premium Business Cards',
        basePrice: 150.00, // 150.00 ZAR base for a pack of 100
        active: true,
        config: {
          sizes: ['standard_biz', 'square_biz']
        }
      }
    ];

    for (const p of products) {
      batch.set(doc(db, 'products', p.id), p);
    }

    // 2. Pricing Rules
    const rules = [
      // Documents & Manuscripts rules
      { id: 'rule_doc_paper_80g', productId: 'prod_document', ruleType: 'paper_stock', key: '80gsm', multiplier: 1.0 },
      { id: 'rule_doc_paper_120g', productId: 'prod_document', ruleType: 'paper_stock', key: '120gsm', multiplier: 1.5 },
      { id: 'rule_doc_finish_none', productId: 'prod_document', ruleType: 'finish', key: 'None', multiplier: 1.0 },
      { id: 'rule_doc_finish_staple', productId: 'prod_document', ruleType: 'finish', key: 'Stapled', multiplier: 1.1 },
      { id: 'rule_doc_finish_bind', productId: 'prod_document', ruleType: 'finish', key: 'Spiral Bound', multiplier: 2.0 },
      
      // Posters rules
      { id: 'rule_post_paper_150g', productId: 'prod_poster', ruleType: 'paper_stock', key: '150gsm Matte', multiplier: 1.0 },
      { id: 'rule_post_paper_200g', productId: 'prod_poster', ruleType: 'paper_stock', key: '200gsm Glossy', multiplier: 1.4 },
      { id: 'rule_post_finish_none', productId: 'prod_poster', ruleType: 'finish', key: 'None', multiplier: 1.0 },
      { id: 'rule_post_finish_lam', productId: 'prod_poster', ruleType: 'finish', key: 'Laminated', multiplier: 1.5 },

      // Flyers rules
      { id: 'rule_fly_paper_120g', productId: 'prod_flyer', ruleType: 'paper_stock', key: '120gsm Gloss', multiplier: 1.0 },
      { id: 'rule_fly_paper_170g', productId: 'prod_flyer', ruleType: 'paper_stock', key: '170gsm Silk', multiplier: 1.3 },
      { id: 'rule_fly_finish_none', productId: 'prod_flyer', ruleType: 'finish', key: 'None', multiplier: 1.0 },
      { id: 'rule_fly_finish_uv', productId: 'prod_flyer', ruleType: 'finish', key: 'UV Coated', multiplier: 1.5 },

      // Business Cards rules
      { id: 'rule_biz_paper_350g', productId: 'prod_bizcard', ruleType: 'paper_stock', key: '350gsm Silk', multiplier: 1.0 },
      { id: 'rule_biz_paper_400g', productId: 'prod_bizcard', ruleType: 'paper_stock', key: '400gsm Luxury', multiplier: 1.5 },
      { id: 'rule_biz_finish_none', productId: 'prod_bizcard', ruleType: 'finish', key: 'None', multiplier: 1.0 },
      { id: 'rule_biz_finish_matte', productId: 'prod_bizcard', ruleType: 'finish', key: 'Matte Lamination', multiplier: 1.2 },
      { id: 'rule_biz_finish_spotuv', productId: 'prod_bizcard', ruleType: 'finish', key: 'Spot UV Accent', multiplier: 1.8 },

      // Turnaround multiplier rules
      { id: 'rule_turn_std', productId: 'all', ruleType: 'turnaround', key: 'standard', multiplier: 1.0 },
      { id: 'rule_turn_exp', productId: 'all', ruleType: 'turnaround', key: 'express', multiplier: 1.3 },
      { id: 'rule_turn_rush', productId: 'all', ruleType: 'turnaround', key: 'rush', multiplier: 1.6 }
    ];

    for (const r of rules) {
      batch.set(doc(db, 'pricing_rules', r.id), r);
    }

    // Write a local seed marker to Firestore config
    batch.set(doc(db, 'config', 'seed_marker'), { seeded: true, timestamp: new Date() });

    await batch.commit();
    console.log('Firestore Database successfully seeded.');
  } catch (error) {
    console.error('Failed to seed Firestore database:', error);
  }
}
