export type UserRole = 'customer' | 'staff' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: any; // Timestamp
  name?: string;
  company?: string;
  phone?: string;
  vatNumber?: string;
  tags?: string[];
}

export interface Product {
  id: string;
  name: string;
  basePrice: number;
  active: boolean;
  config?: any;
}

export interface PricingRule {
  id: string;
  productId: string;
  ruleType: 'paper_stock' | 'finish' | 'turnaround' | 'quantity_tier';
  key: string;
  multiplier: number;
}

export type OrderStatus =
  | 'Received'
  | 'File Review'
  | 'In Production'
  | 'Quality Check'
  | 'Ready for Collection'
  | 'Dispatched';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalPrice: number;
  subtotal: number;
  vat: number;
  createdAt: any; // Timestamp
  productType: string;
  quantity: number;
  specs: {
    paperSize: string;
    paperSizeMm?: string; // custom dimension if size is custom
    paperStock: string;
    finish: string;
    printSides: string;
    colourMode: string;
    [key: string]: any;
  };
  turnaround: string;
  collectionMethod: string;
  deliveryAddress?: string;
  specialInstructions?: string;
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod?: string;
  staffNote?: string;
}

export interface OrderFile {
  id: string;
  orderId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: any; // Timestamp
}

export interface StatusHistory {
  id: string;
  orderId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedByName: string;
  note?: string;
  timestamp: any; // Timestamp
}

export interface NotificationLog {
  id: string;
  userId: string;
  orderId: string;
  channel: 'email' | 'sms';
  content: string;
  sentAt: any; // Timestamp
}
