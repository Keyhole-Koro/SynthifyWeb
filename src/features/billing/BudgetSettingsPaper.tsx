'use client';

import { useState } from 'react';

export function BudgetSettingsPaper() {
  const [budget, setBudget] = useState<string>('50');
  const [alert80, setAlert80] = useState(true);
  const [alert100, setAlert100] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--muted)' }}>
        月次予算を設定すると、上限に近づいた段階で通知が届き、上限到達時は処理中ジョブを途中成果物にまとめて終了します。
      </p>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>
          月次上限 (USD)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.9rem' }}>$</span>
          <input
            type="number"
            min={0}
            step={1}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid var(--link-border)',
              borderRadius: 4,
              background: 'var(--surface-alt)',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700 }}>
          アラート
        </label>
        <Checkbox
          checked={alert80}
          onChange={setAlert80}
          label="80% 到達でメール通知"
        />
        <Checkbox
          checked={alert100}
          onChange={setAlert100}
          label="100% 到達で通知 + ジョブの途中打ち切り"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          保存
        </button>
        {saved && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>保存しました (mock)</span>}
      </div>

      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>
        ※ バックエンド未接続。現状は UI のみのプレースホルダーです。
      </p>
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
