'use client';

import { useEffect, useState } from 'react';
import { createPortalSession } from './api';

interface InvoicePaperProps {
  accountId: string;
}

const MOCK_UPCOMING = {
  amount: 12.34,
  currency: 'USD',
  periodEnd: '2026-05-31',
};

const MOCK_HISTORY = [
  { id: 'in_2026_04', date: '2026-04-30', amount: 8.20, currency: 'USD', status: 'paid' },
  { id: 'in_2026_03', date: '2026-03-31', amount: 14.55, currency: 'USD', status: 'paid' },
  { id: 'in_2026_02', date: '2026-02-28', amount: 6.10, currency: 'USD', status: 'paid' },
];

const MOCK_PAYMENT_METHOD = {
  brand: 'Visa',
  last4: '4242',
  exp: '12/27',
};

export function InvoicePaper({ accountId }: InvoicePaperProps) {
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createPortalSession(accountId)
      .then((nextUrl) => {
        if (!cancelled) {
          setPortalUrl(nextUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('ポータル URL を取得できませんでした。');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPortal(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Section title="今月の請求予定">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            ${MOCK_UPCOMING.amount.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {MOCK_UPCOMING.periodEnd} に確定
          </span>
        </div>
      </Section>

      <Section title="支払い方法">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid var(--link-border)', borderRadius: 6, background: 'var(--surface-alt)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
              {MOCK_PAYMENT_METHOD.brand} •••• {MOCK_PAYMENT_METHOD.last4}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--muted)' }}>
              有効期限 {MOCK_PAYMENT_METHOD.exp}
            </p>
          </div>
          {portalUrl ? (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
            >
              変更 →
            </a>
          ) : (
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
              {loadingPortal ? '読み込み中...' : error ?? ''}
            </span>
          )}
        </div>
      </Section>

      <Section title="請求履歴">
        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>請求日</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>金額</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>状態</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_HISTORY.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--link-border)' }}>
                <td style={{ padding: '6px 8px' }}>{row.date}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>${row.amount.toFixed(2)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: row.status === 'paid' ? '#10b981' : 'var(--muted)' }}>
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {portalUrl && (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 8, fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
          >
            Stripe で全請求書を確認 →
          </a>
        )}
      </Section>

      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>
        ※ 請求予定額・履歴・支払い方法は mock データ。支払い方法の変更・全請求書は Stripe ポータルで実際に確認できます。
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700 }}>
        {title}
      </p>
      {children}
    </div>
  );
}
