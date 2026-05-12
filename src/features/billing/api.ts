import { createRPCClient } from '@/lib/connect';
import { BillingService } from '@synthify/proto-ts/gen/synthify/tree/v1/billing_pb';

const client = createRPCClient(BillingService);

export type BillingCurrency = 'jpy' | 'usd';

export async function createCheckoutSession(accountId: string, currency: BillingCurrency): Promise<string> {
  const res = await client.createCheckoutSession({ accountId, currency });
  return res.checkoutUrl;
}

export async function createPortalSession(accountId: string): Promise<string> {
  const res = await client.createPortalSession({ accountId });
  return res.portalUrl;
}
