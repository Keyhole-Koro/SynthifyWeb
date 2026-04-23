import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { env } from '@/config/env';
import { getAuthHeaders } from '@/features/auth/session';

const transport = createConnectTransport({
  baseUrl: env.apiBaseUrl,
  interceptors: [
    (next) => async (req) => {
      const authHeaders = await getAuthHeaders();
      for (const [key, value] of Object.entries(authHeaders)) {
        req.header.set(key, value);
      }
      return next(req);
    },
  ],
});

export function createRPCClient(service: any) {
  return createClient(service, transport) as any;
}
