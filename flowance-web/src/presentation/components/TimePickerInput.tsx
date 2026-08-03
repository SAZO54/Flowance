'use client'

import {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {Check, Clock3, X} from 'lucide-react'
import {pxToRem, remToPx} from './cssLength'

type TimePickerInputProps = {
  name?: string
  required?: boolean
  defaultValue?: string
  ariaLabel?: string
}

const pad = (value: number) => String(value).padStart(2, '0')

export function TimePickerInput({name, required, defaultValue = '', ariaLabel = '時刻'}: TimePickerInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({top: '0rem', left: '0rem'})
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [hour = '09', minute = '00'] = (value || '09:00').split(':')

  const commit = (nextHour: string, nextMinute: string) => setValue(`${nextHour}:${nextMinute}`)

  useEffect(() => {
    if (!isOpen) return
    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const margin = remToPx(0.5)
      const width = Math.min(remToPx(18), window.innerWidth - remToPx(1))
      setPosition({
        top: pxToRem(Math.max(margin, Math.min(rect.bottom + remToPx(0.25), window.innerHeight - remToPx(13.75)))),
        left: pxToRem(Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin))),
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (wrapperRef.current?.contains(target) || pickerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [isOpen])

  const picker = isOpen && typeof document !== 'undefined' ? createPortal(
    <div ref={pickerRef} className="date-time-picker-popover" role="dialog" aria-label={`${ariaLabel}を選択`} style={{top: position.top, left: position.left}}>
      <div className="date-time-picker-head time-picker-head"><Clock3/><strong>{ariaLabel}</strong><button type="button" aria-label="閉じる" onClick={() => setIsOpen(false)}><X/></button></div>
      <div className="time-picker-options">
        <label><span>時</span><select value={hour} onChange={event => commit(event.target.value, minute)}>{Array.from({length: 24}, (_, item) => <option key={item} value={pad(item)}>{pad(item)}時</option>)}</select></label>
        <b>:</b>
        <label><span>分</span><select value={minute} onChange={event => commit(hour, event.target.value)}>{Array.from({length: 60}, (_, item) => <option key={item} value={pad(item)}>{pad(item)}分</option>)}</select></label>
      </div>
      <button type="button" className="time-picker-done" onClick={() => setIsOpen(false)}><Check/>完了</button>
    </div>,
    document.body,
  ) : null

  return <span className="date-time-picker time-picker" ref={wrapperRef}>
    <input type="text" name={name} required={required} value={value} readOnly aria-label={ariaLabel}/>
    <button type="button" className="date-time-picker-trigger" aria-label={`${ariaLabel}を選択`} aria-expanded={isOpen} onClick={() => setIsOpen(current => !current)}>{isOpen ? <X/> : <Clock3/>}</button>
    {picker}
  </span>
}
