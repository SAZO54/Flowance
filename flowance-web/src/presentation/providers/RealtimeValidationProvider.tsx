'use client'

import {type ReactNode, useEffect} from 'react'
import {
  FORM_API_ERROR_EVENT,
  type FormApiErrorEventDetail,
} from '@/shared/errors/errorHandling'
import {VALIDATION_CODE} from '@/shared/errors/errorCodes'
import {validationMessage} from '@/shared/errors/errorMessages'
import {
  validateControl,
  validateRange,
  type ValidationIssue,
} from '@/shared/validation/validationRules'

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function controls(form: HTMLFormElement): Control[] {
  return Array.from(form.elements).filter(
    (item): item is Control =>
      item instanceof HTMLInputElement ||
      item instanceof HTMLSelectElement ||
      item instanceof HTMLTextAreaElement,
  )
}

function errorHost(control: Control): HTMLElement {
  return control.closest('label') ?? control.parentElement ?? control.form ?? document.body
}

function errorId(control: Control): string {
  const base = control.name || control.id || control.getAttribute('aria-label') || 'field'
  return `validation-${base.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function characterCounterId(control: HTMLTextAreaElement): string {
  return `${errorId(control)}-character-count`
}

function syncCharacterCounter(control: HTMLTextAreaElement): void {
  const maximum = Number(control.dataset.maxLength)
  const host = errorHost(control)
  const id = characterCounterId(control)
  let node = host.querySelector<HTMLElement>(`[data-character-count-for="${id}"]`)
  const describedBy = new Set(
    (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
  )

  if (!Number.isInteger(maximum) || maximum <= 0) {
    node?.remove()
    describedBy.delete(id)
    if (describedBy.size) control.setAttribute('aria-describedby', [...describedBy].join(' '))
    else control.removeAttribute('aria-describedby')
    return
  }

  if (!node) {
    node = document.createElement('span')
    node.className = 'form-character-count'
    node.dataset.characterCountFor = id
    node.id = id
    host.append(node)
  }

  const current = Array.from(control.value).length
  const text = `${current}\uFF0F${maximum}`
  const overLimit = String(current > maximum)
  if (node.textContent !== text) node.textContent = text
  if (node.dataset.overLimit !== overLimit) {
    node.dataset.overLimit = overLimit
  }
  describedBy.add(id)
  control.setAttribute('aria-describedby', [...describedBy].join(' '))
}

function showIssue(control: Control, issue: ValidationIssue | null): void {
  const host = errorHost(control)
  const id = errorId(control)
  const node = host.querySelector<HTMLElement>(`[data-validation-for="${id}"]`)
  const describedBy = new Set(
    (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
  )
  if (!issue) {
    control.removeAttribute('aria-invalid')
    describedBy.delete(id)
    if (describedBy.size) control.setAttribute('aria-describedby', [...describedBy].join(' '))
    else control.removeAttribute('aria-describedby')
    node?.remove()
    return
  }

  control.setAttribute('aria-invalid', 'true')
  let errorNode = node
  if (!errorNode) {
    errorNode = document.createElement('span')
    errorNode.className = 'form-field-error'
    errorNode.dataset.validationFor = id
    errorNode.id = id
    errorNode.setAttribute('role', 'alert')
    const characterCounter =
      control instanceof HTMLTextAreaElement
        ? host.querySelector(`[data-character-count-for="${characterCounterId(control)}"]`)
        : null
    if (characterCounter) host.insertBefore(errorNode, characterCounter)
    else host.append(errorNode)
  }
  errorNode.textContent = issue.message
  describedBy.add(id)
  control.setAttribute('aria-describedby', [...describedBy].join(' '))
}

function validateAndRender(control: Control): boolean {
  const issue = validateControl(control) ?? validateRange(control)
  if (issue) {
    delete control.dataset.apiErrorValue
    showIssue(control, issue)
    return false
  }
  if (control.dataset.apiErrorValue === control.value) return false
  delete control.dataset.apiErrorValue
  showIssue(control, null)
  return true
}

function isFormValid(form: HTMLFormElement): boolean {
  return controls(form).every(
    control =>
      control.dataset.apiErrorValue !== control.value &&
      !validateControl(control) &&
      !validateRange(control),
  )
}

function syncSubmitState(form: HTMLFormElement): void {
  const invalid = !isFormValid(form)
  form
    .querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      'button[type="submit"],input[type="submit"]',
    )
    .forEach(button => {
      if (invalid && !button.disabled) {
        button.disabled = true
        button.dataset.validationBlocked = 'true'
      } else if (!invalid && button.dataset.validationBlocked === 'true') {
        button.disabled = false
        delete button.dataset.validationBlocked
      }
    })
}

function fieldCandidates(field: string): string[] {
  const normalized = field.replace(/\[(\d+)\]/g, '.$1')
  const parts = normalized.split('.').filter(Boolean)
  return [
    normalized,
    parts.at(-1) ?? normalized,
    parts.filter(part => !/^\d+$/.test(part)).at(-1) ?? normalized,
  ]
}

function findControl(form: HTMLFormElement, field: string): Control | null {
  for (const candidate of fieldCandidates(field)) {
    const item = form.elements.namedItem(candidate)
    if (
      item instanceof HTMLInputElement ||
      item instanceof HTMLSelectElement ||
      item instanceof HTMLTextAreaElement
    ) {
      return item
    }
  }
  return null
}

async function validateImageDimensions(control: HTMLInputElement): Promise<void> {
  const file = control.files?.[0]
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    const dimensions = await new Promise<{width: number; height: number}>(
      (resolve, reject) => {
        image.onload = () =>
          resolve({width: image.naturalWidth, height: image.naturalHeight})
        image.onerror = reject
        image.src = url
      },
    )
    if (
      dimensions.width > 4096 ||
      dimensions.height > 4096 ||
      dimensions.width * dimensions.height > 16_777_216
    ) {
      showIssue(control, {
        code: VALIDATION_CODE.IMAGE_DIMENSION_TOO_LARGE,
        message: validationMessage(VALIDATION_CODE.IMAGE_DIMENSION_TOO_LARGE),
      })
    }
  } catch {
    showIssue(control, {
      code: VALIDATION_CODE.INVALID_FORMAT,
      message: validationMessage(VALIDATION_CODE.INVALID_FORMAT),
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function RealtimeValidationProvider({children}: {children: ReactNode}) {
  useEffect(() => {
    let activeForm: HTMLFormElement | null = null

    const validateForm = (form: HTMLFormElement) => {
      controls(form).forEach(control => {
        if (control instanceof HTMLTextAreaElement) syncCharacterCounter(control)
        validateAndRender(control)
      })
      syncSubmitState(form)
    }
    const onInput = (event: Event) => {
      const target = event.target
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLSelectElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        return
      }
      if (target instanceof HTMLTextAreaElement) syncCharacterCounter(target)
      if (!target.form) return
      activeForm = target.form
      validateForm(target.form)
    }
    const onChange = (event: Event) => {
      onInput(event)
      const target = event.target
      if (target instanceof HTMLInputElement && target.type === 'file') {
        void validateImageDimensions(target)
      }
    }
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      activeForm = form
      const invalid = controls(form).filter(control => !validateAndRender(control))
      if (invalid.length) {
        event.preventDefault()
        event.stopImmediatePropagation()
        invalid[0]?.focus()
      }
      syncSubmitState(form)
    }
    const onApiError = (event: Event) => {
      const detail = (event as CustomEvent<FormApiErrorEventDetail>).detail
      const form =
        activeForm ?? (document.activeElement?.closest('form') as HTMLFormElement | null)
      if (!form) return
      detail.details.forEach(item => {
        if (!item.field) return
        const control = findControl(form, item.field)
        if (control) {
          control.dataset.apiErrorValue = control.value
          showIssue(control, {code: item.code, message: item.message})
        }
      })
      syncSubmitState(form)
    }
    const initialize = () => {
      document
        .querySelectorAll<HTMLTextAreaElement>('textarea[data-max-length]')
        .forEach(syncCharacterCounter)
      document.querySelectorAll<HTMLFormElement>('form').forEach(syncSubmitState)
    }
    const observer = new MutationObserver(initialize)
    observer.observe(document.body, {childList: true, subtree: true})
    initialize()
    document.addEventListener('input', onInput, true)
    document.addEventListener('change', onChange, true)
    document.addEventListener('submit', onSubmit, true)
    window.addEventListener(FORM_API_ERROR_EVENT, onApiError)
    return () => {
      observer.disconnect()
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('change', onChange, true)
      document.removeEventListener('submit', onSubmit, true)
      window.removeEventListener(FORM_API_ERROR_EVENT, onApiError)
    }
  }, [])
  return children
}