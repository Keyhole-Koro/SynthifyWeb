import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import type { DescService } from '@bufbuild/protobuf';
import { auth } from '@/lib/firebase';
import { env } from '@/config/env';

const transport = createConnectTransport({
  baseUrl: env.apiBaseUrl,
  interceptors: [
    (next) => async (req) => {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        req.header.set('Authorization', `Bearer ${token}`);
      }
      return next(req);
    },
  ],
});

export function createRPCClient<T extends DescService>(service: T) {
  return createClient(service, transport);
}
