import React from 'react'

type Props = {
  value: string | number
  onChange: (val: number) => void
}

const PRESETS = [
  { label: '1 mes', months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 año', months: 12 },
  { label: '2 años', months: 24 },
  { label: '3+ años', months: 36 },
]

export function TenureSelector({ value, onChange }: Props) {
  const selected = Number(value) || 0

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.months}
            type="button"
            onClick={() => onChange(p.months)}
            className={`px-3 py-2 rounded-lg border transition-colors text-sm ${selected === p.months ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:border-gray-300'}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Personalizado (meses)</label>
        <input
          type="number"
          min={0}
          value={selected}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="form-input w-full"
          placeholder="0"
        />
      </div>
    </div>
  )
}

export default TenureSelector
