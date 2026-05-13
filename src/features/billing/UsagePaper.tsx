'use client';

const MOCK_BREAKDOWN = [
  { model: 'gemini-2.5-pro', inputCost: 4.21, outputCost: 5.32 },
  { model: 'gemini-2.5-flash', inputCost: 1.05, outputCost: 1.40 },
  { model: 'embedding-001', inputCost: 0.36, outputCost: 0 },
];

const MOCK_BUDGET = 50.0;

export function UsagePaper() {
  const total = MOCK_BREAKDOWN.reduce((sum, row) => sum + row.inputCost + row.outputCost, 0);
  const percent = Math.min(100, Math.round((total / MOCK_BUDGET) * 100));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700 }}>
            今月の合計
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            ${total.toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>/ ${MOCK_BUDGET.toFixed(0)}</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-alt)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percent}%`, background: percent >= 80 ? '#f59e0b' : 'var(--accent)' }} />
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 6px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700 }}>
          モデル別内訳
        </p>
        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Model</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Input</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Output</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>合計</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_BREAKDOWN.map((row) => (
              <tr key={row.model} style={{ borderBottom: '1px solid var(--link-border)' }}>
                <td style={{ padding: '6px 8px' }}>{row.model}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--muted)' }}>${row.inputCost.toFixed(2)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--muted)' }}>${row.outputCost.toFixed(2)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>${(row.inputCost + row.outputCost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>
        ※ バックエンド未接続。現状は mock データを表示しています。
      </p>
    </div>
  );
}
