'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {CalendarDays, Check, ChevronLeft, ChevronRight, X} from 'lucide-react'
import {pxToRem, remToPx} from './cssLength'

type DateTimePickerInputProps = {
  name?: string
  required?: boolean
  value?: string
  defaultValue?: string
  min?: string
  ariaLabel?: string
  dateOnly?: boolean
  onValueChange?: (value: string) => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const pad = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function parseDate(value?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function calendarDays(viewMonth: Date): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  first.setDate(first.getDate() - first.getDay())
  return Array.from({length: 42}, (_, index) => {
    const date = new Date(first)
    date.setDate(first.getDate() + index)
    return date
  })
}

export function DateTimePickerInput({
  name,
  required,
  value,
  defaultValue = '',
  min,
  ariaLabel,
  dateOnly = false,
  onValueChange,
}: DateTimePickerInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => parseDate(value ?? defaultValue) ?? new Date())
  const [position, setPosition] = useState({top: '0rem', left: '0rem'})
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const currentValue = value ?? internalValue
  const selectedDate = parseDate(currentValue)
  const days = useMemo(() => calendarDays(viewMonth), [viewMonth])

  const commit = (nextValue: string) => {
    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  useEffect(() => {
    if (!isOpen) return
    const selected = parseDate(currentValue)
    if (selected) setViewMonth(selected)

    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const margin = remToPx(0.5)
      const width = Math.min(remToPx(18), window.innerWidth - remToPx(1))
      setPosition({
        top: pxToRem(Math.max(margin, Math.min(rect.bottom + remToPx(0.25), window.innerHeight - remToPx(23)))),
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
  }, [currentValue, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (wrapperRef.current?.contains(target) || pickerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const selectDate = (date: Date) => {
    if (dateOnly) {
      commit(dateKey(date))
      setIsOpen(false)
      return
    }
    const time = currentValue.slice(11, 16) || '09:00'
    commit(`${dateKey(date)}T${time}`)
  }

  const selectTimePart = (part: 'hour' | 'minute', value: string) => {
    const date = selectedDate ?? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const currentTime = currentValue.slice(11, 16) || '09:00'
    const [hour, minute] = currentTime.split(':')
    commit(`${dateKey(date)}T${part === 'hour' ? value : hour}:${part === 'minute' ? value : minute}`)
  }

  const picker = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={pickerRef}
      className="date-time-picker-popover"
      role="dialog"
      aria-label={ariaLabel ? `${ariaLabel}を選択` : '日時を選択'}
      style={{top: position.top, left: position.left}}
    >
      <div className="date-time-picker-head">
        <button type="button" aria-label="前の月" onClick={() => setViewMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft/></button>
        <strong>{new Intl.DateTimeFormat('ja-JP', {year: 'numeric', month: 'long'}).format(viewMonth)}</strong>
        <button type="button" aria-label="次の月" onClick={() => setViewMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight/></button>
      </div>
      <div className="date-time-picker-weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
      <div className="date-time-picker-days">{days.map(day => {
        const key = dateKey(day)
        const isSelected = key === currentValue.slice(0, 10)
        const isOutside = day.getMonth() !== viewMonth.getMonth()
        const isDisabled = Boolean(min && key < min.slice(0, 10))
        return <button type="button" key={key} className={`${isSelected ? 'selected ' : ''}${isOutside ? 'outside' : ''}`} disabled={isDisabled} aria-label={`${day.getMonth() + 1}月${day.getDate()}日`} onClick={() => selectDate(day)}><span>{day.getDate()}</span>{isSelected && <Check aria-hidden="true"/>}</button>
      })}</div>
      {!dateOnly && <div className="date-time-picker-time">
        <div className="date-time-picker-time-selects">
          <label><span>時</span><select value={currentValue.slice(11, 13) || '09'} onChange={event => selectTimePart('hour', event.target.value)}>{Array.from({length: 24}, (_, hour) => <option key={hour} value={pad(hour)}>{pad(hour)}</option>)}</select></label>
          <b>:</b>
          <label><span>分</span><select value={currentValue.slice(14, 16) || '00'} onChange={event => selectTimePart('minute', event.target.value)}>{Array.from({length: 60}, (_, minute) => <option key={minute} value={pad(minute)}>{pad(minute)}</option>)}</select></label>
        </div>
        <button type="button" onClick={() => setIsOpen(false)}>完了</button>
      </div>}
    </div>,
    document.body,
  ) : null

  return <span className="date-time-picker" ref={wrapperRef}>
    <input
      type={dateOnly ? 'date' : 'datetime-local'}
      name={name}
      required={required}
      value={currentValue}
      min={min}
      aria-label={ariaLabel}
      onChange={event => commit(event.target.value)}
    />
    <button type="button" className="date-time-picker-trigger" aria-label={ariaLabel ? `${ariaLabel}のカレンダーを開く` : 'カレンダーを開く'} aria-expanded={isOpen} onClick={() => setIsOpen(current => !current)}>{isOpen ? <X/> : <CalendarDays/>}</button>
    {picker}
  </span>
}

export function DatePickerInput(props: Omit<DateTimePickerInputProps, 'dateOnly'>) {
  return <DateTimePickerInput {...props} dateOnly/>
}
