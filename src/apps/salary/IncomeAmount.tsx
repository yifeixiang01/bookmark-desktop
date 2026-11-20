import { useState } from 'react'

/** Only changed digits move; a fixed-width window keeps the amount steady. */
export function IncomeAmount({ text, animate }: { text: string; animate: boolean }) {
  if (!animate) return <>{text}</>
  return <span className="salary-digits" aria-label={text}>
    {Array.from(text, (digit, index) => /\d/.test(digit)
      ? <Digit key={text.length - index} digit={digit} />
      : <span key={text.length - index} aria-hidden="true">{digit}</span>)}
  </span>
}

function Digit({ digit }: { digit: string }) {
  const [value, setValue] = useState({ current: digit, previous: digit })
  if (value.current !== digit) setValue({ current: digit, previous: value.current })
  return <span className="salary-digit" aria-hidden="true"><span key={value.current} className="salary-digit-track" data-changed={value.previous !== value.current}><span>{value.previous}</span><span>{value.current}</span></span></span>
}
