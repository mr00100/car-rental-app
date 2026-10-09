// Payment gateway abstraction.
// Supports pluggable providers with a safe demo/mock fallback so the app
// works fully even without real gateway credentials.

export type PaymentInitInput = {
  bookingId: number;
  bookingRef: string;
  amount: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  method: string; // easypaisa | jazzcash | stripe | mock
};

export type PaymentInitResult = {
  provider: string;
  demo: boolean;
  // For manual gateways: instructions. For redirect gateways: a URL.
  mode: "manual" | "redirect" | "intent";
  reference: string;
  instructions?: string;
  redirectUrl?: string | null;
  clientSecret?: string | null;
};

export type PaymentVerifyInput = {
  provider: string;
  reference: string;
  transactionId?: string;
  amount: number;
};

export type PaymentVerifyResult = {
  verified: boolean;
  demo: boolean;
  message: string;
  gatewayReference?: string;
};

export interface PaymentProvider {
  readonly name: string;
  readonly demo: boolean;
  isConfigured(): boolean;
  initiate(input: PaymentInitInput): Promise<PaymentInitResult>;
  verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
}

/* ---------------- EasyPaisa (manual submission workflow) ---------------- */
class EasyPaisaProvider implements PaymentProvider {
  name = "easypaisa";
  get demo() {
    return !this.isConfigured();
  }
  isConfigured() {
    return Boolean(
      process.env.EASYPAISA_API_KEY && process.env.EASYPAISA_SECRET
    );
  }
  async initiate(input: PaymentInitInput): Promise<PaymentInitResult> {
    const number = process.env.EASYPAISA_NUMBER || "03001234567";
    return {
      provider: this.name,
      demo: this.demo,
      mode: "manual",
      reference: input.bookingRef,
      instructions: `Send Rs. ${input.amount.toLocaleString(
        "en-PK"
      )} to EasyPaisa ${number}, then submit your transaction ID.`,
      redirectUrl: null,
    };
  }
  async verify(): Promise<PaymentVerifyResult> {
    // Manual workflow: verification happens via admin action, never auto-verify.
    return {
      verified: false,
      demo: this.demo,
      message:
        "EasyPaisa payments are verified manually by an admin after review.",
    };
  }
}

/* ---------------- JazzCash (manual submission workflow) ---------------- */
class JazzCashProvider implements PaymentProvider {
  name = "jazzcash";
  get demo() {
    return !this.isConfigured();
  }
  isConfigured() {
    return Boolean(
      process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_PASSWORD
    );
  }
  async initiate(input: PaymentInitInput): Promise<PaymentInitResult> {
    const number = process.env.JAZZCASH_NUMBER || "03001234567";
    return {
      provider: this.name,
      demo: this.demo,
      mode: "manual",
      reference: input.bookingRef,
      instructions: `Send Rs. ${input.amount.toLocaleString(
        "en-PK"
      )} to JazzCash ${number}, then submit your transaction ID.`,
    };
  }
  async verify(): Promise<PaymentVerifyResult> {
    return {
      verified: false,
      demo: this.demo,
      message: "JazzCash payments are verified manually by an admin.",
    };
  }
}

/* ---------------- Stripe (redirect / intent) ---------------- */
class StripeProvider implements PaymentProvider {
  name = "stripe";
  get demo() {
    return !this.isConfigured();
  }
  isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }
  async initiate(input: PaymentInitInput): Promise<PaymentInitResult> {
    if (!this.isConfigured()) {
      // Demo mode: no real intent created.
      return {
        provider: this.name,
        demo: true,
        mode: "intent",
        reference: `demo_${input.bookingRef}`,
        instructions:
          "Demo mode: Stripe is not configured. No real charge will occur.",
        clientSecret: null,
      };
    }
    // With real credentials you would create a PaymentIntent here.
    return {
      provider: this.name,
      demo: false,
      mode: "intent",
      reference: input.bookingRef,
      clientSecret: null,
      instructions: "Complete card payment to confirm your booking.",
    };
  }
  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (!this.isConfigured()) {
      return {
        verified: false,
        demo: true,
        message: "Demo mode: Stripe verification requires configuration.",
      };
    }
    // Real verification would query Stripe by reference/intent id.
    return {
      verified: false,
      demo: false,
      message: "Awaiting Stripe webhook confirmation.",
      gatewayReference: input.reference,
    };
  }
}

/* ---------------- Mock (clearly labelled demo) ---------------- */
class MockPaymentProvider implements PaymentProvider {
  name = "mock";
  demo = true;
  isConfigured() {
    return true;
  }
  async initiate(input: PaymentInitInput): Promise<PaymentInitResult> {
    return {
      provider: this.name,
      demo: true,
      mode: "manual",
      reference: `mock_${input.bookingRef}`,
      instructions:
        "DEMO MODE — no real payment gateway configured. An admin must still verify this payment manually.",
    };
  }
  async verify(): Promise<PaymentVerifyResult> {
    // Never auto-confirm as real. Manual verification required.
    return {
      verified: false,
      demo: true,
      message: "DEMO MODE — payment must be verified manually by an admin.",
    };
  }
}

const providers: Record<string, PaymentProvider> = {
  easypaisa: new EasyPaisaProvider(),
  jazzcash: new JazzCashProvider(),
  stripe: new StripeProvider(),
  mock: new MockPaymentProvider(),
};

export function getPaymentProvider(method?: string): PaymentProvider {
  const key = (method || process.env.PAYMENT_PROVIDER || "easypaisa").toLowerCase();
  return providers[key] || providers.easypaisa;
}

export function listPaymentMethods() {
  return Object.values(providers).map((p) => ({
    name: p.name,
    demo: p.demo,
    configured: p.isConfigured(),
  }));
}
