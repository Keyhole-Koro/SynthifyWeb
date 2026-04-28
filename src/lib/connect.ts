import { createClient, type Client } from '@connectrpc/connect';
import type { DescService } from '@bufbuild/protobuf';
import { createConnectTransport } from '@connectrpc/connect-web';
import { env } from '@/config/env';
import { getAuthHeaders } from '@/features/auth/auth';

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

export function createRPCClient<T extends DescService>(service: T): Client<T> {
  return createClient(service, transport);
}
