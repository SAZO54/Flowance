'use client'

import {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {CalendarDays, ChevronLeft, ChevronRight, X} from 'lucide-react'
import {pxToRem, remToPx} from './cssLength'

type MonthPickerInputProps = {
  value: string
  ariaLabel?: string
  onValueChange: (value: string) => void
}

const pad = (value: number) => String(value).padStart(2, '0')

function initialYear(value: string): number {
  const year = Number(value.slice(0, 4))
  return Number.isInteger(year) && year > 0 ? year : new Date().getFullYear()
}

export function MonthPickerInput({value, ariaLabel = '月', onValueChange}: MonthPickerInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [year, setYear] = useState(() => initialYear(value))
  const [position, setPosition] = useState({top: '0rem', left: '0rem'})
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setYear(initialYear(value))
    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const margin = remToPx(0.5)
      const width = Math.min(remToPx(18), window.innerWidth - remToPx(1))
      setPosition({
        top: pxToRem(Math.max(margin, Math.min(rect.bottom + remToPx(0.25), window.innerHeight - remToPx(15)))),
        left: pxToRem(Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin))),
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, value])

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

  const displayValue = value ? `${value.slice(0, 4)}年${value.slice(5, 7)}月` : ''
  const picker = isOpen && typeof document !== 'undefined' ? createPortal(
    <div ref={pickerRef} className="date-time-picker-popover" role="dialog" aria-label={`${ariaLabel}を選択`} style={{top: position.top, left: position.left}}>
      <div className="date-time-picker-head">
        <button type="button" aria-label="前年" onClick={() => setYear(current => current - 1)}><ChevronLeft/></button>
        <strong>{year}年</strong>
        <button type="button" aria-label="翌年" onClick={() => setYear(current => current + 1)}><ChevronRight/></button>
      </div>
      <div className="month-picker-grid">{Array.from({length: 12}, (_, index) => {
        const monthValue = `${year}-${pad(index + 1)}`
        return <button type="button" className={value === monthValue ? 'selected' : ''} key={monthValue} onClick={() => {onValueChange(monthValue); setIsOpen(false)}}>{index + 1}月</button>
      })}</div>
    </div>,
    document.body,
  ) : null

  return <span className="date-time-picker month-picker" ref={wrapperRef}>
    <input type="text" value={displayValue} placeholder="すべて" aria-label={ariaLabel} readOnly onClick={() => setIsOpen(true)}/>
    <button type="button" className="date-time-picker-trigger" aria-label={`${ariaLabel}のカレンダーを開く`} aria-expanded={isOpen} onClick={() => setIsOpen(current => !current)}>{isOpen ? <X/> : <CalendarDays/>}</button>
    {picker}
  </span>
}
