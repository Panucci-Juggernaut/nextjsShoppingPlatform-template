declare module '@paystack/inline-js' {
  export default class PaystackPop {
    newTransaction(options: {
      key: string;
      email: string;
      amount: number; // amount in Kobo
      reference?: string;
      currency?: string;
      metadata?: Record<string, unknown>;
      onSuccess?: (response?: unknown) => void;
      onCancel?: () => void;
    }): void;
  }
}


