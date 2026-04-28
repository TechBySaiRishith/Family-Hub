export interface CouponSummary {
  id: string;
  sourceApp: string;
  description: string;
  code: string | null;
  expiryDate: Date;
}
