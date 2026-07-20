'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import type {SettingsData, SettingsPatch} from '@/domain/settings'
import type {SettingsGateway} from '@/application/settings'
import {loadSettings, updateSettings} from '@/application/settings'
import {ApiError} from '@/infrastructure/api/apiClient'
import {useAuthSession} from '@/presentation/providers/AuthSessionProvider'
import {SettingsView} from './SettingsView'

type SettingsContainerProps = {
  gateway: SettingsGateway
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function writableProfile(settings: SettingsData) {
  const {displayName, familyName, givenName, phoneNumber, bio} = settings.profile
  return {displayName, familyName, givenName, phoneNumber, bio}
}

function writableOrganization(settings: SettingsData) {
  const {name, timezone} = settings.organization
  return {name, timezone}
}

function writableBusiness(settings: SettingsData) {
  const {
    businessName,
    postalCode,
    prefecture,
    address,
    invoiceRegistrationNumber,
    defaultTaxRate,
  } = settings.business
  return {
    businessName,
    postalCode,
    prefecture,
    address,
    invoiceRegistrationNumber,
    defaultTaxRate,
  }
}

function buildPatch(saved: SettingsData, draft: SettingsData): SettingsPatch | null {
  const patch: SettingsPatch = {versions: {}}
  const profile = writableProfile(draft)
  if (!same(writableProfile(saved), profile)) {
    patch.profile = profile
    patch.versions.user = saved.versions.user
  }
  if (!same(saved.appearance, draft.appearance)) {
    patch.appearance = draft.appearance
    patch.versions.user = saved.versions.user
  }
  const organization = writableOrganization(draft)
  if (draft.organization.canEdit && !same(writableOrganization(saved), organization)) {
    patch.organization = organization
    patch.versions.organization = saved.versions.organization
  }
  const business = writableBusiness(draft)
  if (draft.business.canEdit && !same(writableBusiness(saved), business)) {
    patch.business = business
    patch.versions.business = saved.versions.business
  }
  return Object.keys(patch).length === 1 ? null : patch
}

export function SettingsContainer({gateway}: SettingsContainerProps) {
  const {setContext} = useAuthSession()
  const [saved, setSaved] = useState<SettingsData | null>(null)
  const [draft, setDraft] = useState<SettingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setConflict(false)
    try {
      const result = await loadSettings(gateway)
      setSaved(result)
      setDraft(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '設定を取得できませんでした。')
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  useEffect(() => {
    void load()
  }, [load])

  const patch = useMemo(
    () => saved && draft ? buildPatch(saved, draft) : null,
    [draft, saved],
  )

  const submit = async () => {
    if (!patch || !draft) return
    setIsSaving(true)
    setError(null)
    setConflict(false)
    try {
      const result = await updateSettings(gateway, patch)
      setSaved(result)
      setDraft(result)
      setContext(current => current ? {
        ...current,
        user: {
          ...current.user,
          displayName: result.profile.displayName,
          timezone: result.appearance.timezone,
        },
        appearance: result.appearance,
        organization: {
          ...current.organization,
          name: result.organization.name,
        },
        permissions: result.permissions,
      } : current)
      setSavedNotice(true)
      window.setTimeout(() => setSavedNotice(false), 2400)
    } catch (cause) {
      setConflict(cause instanceof ApiError && cause.status === 409)
      setError(cause instanceof Error ? cause.message : '設定を保存できませんでした。')
    } finally {
      setIsSaving(false)
    }
  }

  return <SettingsView
    saved={saved}
    draft={draft}
    isLoading={isLoading}
    isSaving={isSaving}
    isDirty={patch !== null}
    savedNotice={savedNotice}
    error={error}
    conflict={conflict}
    onChange={setDraft}
    onSave={() => void submit()}
    onCancel={() => {
      setDraft(saved)
      setError(null)
      setConflict(false)
    }}
    onRetry={() => void load()}
    onDismissError={() => {
      setError(null)
      setConflict(false)
    }}
  />
}
