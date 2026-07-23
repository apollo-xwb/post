export enum UserRole {
  CUSTOMER = 'customer',
  STAFF = 'staff',
  ADMIN = 'admin'
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  vatNumber?: string;
  tags?: string[];
  role: UserRole | 'customer' | 'staff' | 'admin';
  createdAt: any; // Timestamp or date string
}



export interface Order {
  id: string;
  userId: string;
  status: 'Received' | 'File Review' | 'In Production' | 'Quality Check' | 'Ready for Collection' | 'Dispatched';
  totalPrice: number;
  createdAt: any;
  productType: 'Document' | 'Poster' | 'Flyer' | 'Business Card' | string;
  quantity: number;
  specs: {
    paperSize: string;
    paperWeight: string;
    finish: string;
    sides: 'single' | 'double';
    colorMode: 'color' | 'grayscale';
    turnaround: 'standard' | 'express' | 'rush';
    alignment?: {
      scale: number;
      offsetX: number;
      offsetY: number;
      rotation: number;
      grayscale: boolean;
    };
    customWidth?: number;
    customHeight?: number;
    flyerConfig?: string; // Standard or custom flyer type
  };
  paymentStatus: 'unpaid' | 'paid';
  staffNote?: string;
  iqInvoiceId?: string; // Integrated IQ Retail invoice ID
  iqSyncStatus?: 'pending' | 'synced' | 'failed';
  iqError?: string;
  iqSyncTime?: any;
}

export interface OrderFile {
  id: string;
  orderId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: any;
}

export interface Product {
  id: string;
  name: string;
  basePrice: number;
  active: boolean;
  config?: {
    sizes?: string[];
  };
}

export interface PricingRule {
  id: string;
  productId: string;
  ruleType: 'paper_stock' | 'finish' | 'turnaround' | 'quantity_tier';
  key: string;
  multiplier: number;
}

export interface StatusHistory {
  id: string;
  orderId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  timestamp: any;
}

export interface IQConfig {
  baseUrl: string;
  companyId: string;
  apiKey: string;
  username?: string;
  password?: string;
}

export interface StationeryItem {
  id: string;
  name: string;
  category: 'Paper & Media' | 'Packaging & Postal' | 'Office Supplies' | 'Filing & Storage';
  price: number;
  image: string;
  description: string;
  stock: number;
  sku: string;
}

export interface CartItem {
  item: StationeryItem;
  quantity: number;
}

