import React, { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import type { Client, ProjectStatus } from '../../../domain/models'

export type ProjectCreateValues = { name: string; clientId: string; status: ProjectStatus; budget: number; startDate: string; endDate: string; targetHours: number; color: string }
type ProjectCreateProps = { clients: Client[]; onCancel: () => void; onCreate: (values: ProjectCreateValues) => void }
const hash = String.fromCharCode(35)
const presetColors = [hash + '75A8C7', hash + '8DBFD3', hash + '426C5A', hash + 'D36F86', hash + 'A47A35']
const hexColorPattern = new RegExp('^' + hash + '[0-9A-Fa-f]{6}' + String.fromCharCode(36))

export function ProjectCreate({clients, onCancel, onCreate}: ProjectCreateProps) {
  const [color, setColor] = useState(presetColors[0])
  const [startDate, setStartDate] = useState('')
  const activeClients = clients.filter(client=>client.status==='active')
  const normalizedColor = color.toUpperCase()
  const colorPickerValue = hexColorPattern.test(color) ? color : presetColors[0]
  const isPresetSelected = presetColors.includes(normalizedColor)
  const updateColor = (value: string) => {
    const nextColor = value.startsWith(hash) ? value : hash + value
    setColor(nextColor.toUpperCase())
  }
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hexColorPattern.test(color)) return
    const formData = new FormData(event.currentTarget)
    onCreate({name:String(formData.get('name')??'').trim(),clientId:String(formData.get('clientId')??''),status:String(formData.get('status')??'active') as ProjectStatus,budget:Number(formData.get('budget')),startDate:String(formData.get('startDate')??''),endDate:String(formData.get('endDate')??''),targetHours:Number(formData.get('targetHours')),color:normalizedColor})
  }

  return <div className='client-form-page project-create-page'>
    <button className='client-form-back' type='button' onClick={onCancel}><ArrowLeft size='1rem'/>案件一覧</button>
    <div className='client-form-title'><p className='eyebrow'>NEW PROJECT</p><h1>新しい案件</h1><p>案件の基本情報と契約条件を登録します。</p></div>
    <form className='client-form-card' onSubmit={handleSubmit}>
      <section className='client-form-section'><div className='client-form-section-head'><h2>基本情報</h2><p>案件名と取引先を設定します。</p></div><div className='client-form-fields'>
        <label className='full'><span className='field-label'>案件名 <i className='required-symbol'>※</i></span><input name='name' placeholder='例：SaaS リニューアル' required autoFocus/></label>
        <label><span className='field-label'>既存クライアント <i className='required-symbol'>※</i></span><span className='select-wrap'><select name='clientId' required defaultValue=''><option value='' disabled>{activeClients.length?'クライアントを選択してください':'取引中のクライアントがありません'}</option>{activeClients.map(client=><option key={client.id} value={client.id}>{client.name}（{client.contact}）</option>)}</select><ChevronDown size='1.0625rem'/></span><small className='field-help'>登録済みで取引中のクライアントから選択します。</small></label>
        <label><span className='field-label'>ステータス <i className='required-symbol'>※</i></span><span className='select-wrap'><select name='status' required defaultValue='active'><option value='active'>進行中</option><option value='attention'>確認待ち</option></select><ChevronDown size='1.0625rem'/></span></label>
      </div></section>
      <section className='client-form-section'><div className='client-form-section-head'><h2>契約・稼働</h2><p>金額、期間、目標時間を設定します。</p></div><div className='client-form-fields'>
        <label className='full'><span className='field-label'>契約金額（円） <i className='required-symbol'>※</i></span><input type='number' name='budget' min='0' max='10000000' step='1' placeholder='例：500000' required/></label>
        <label><span className='field-label'>開始日 <i className='required-symbol'>※</i></span><input type='date' name='startDate' value={startDate} onChange={event=>setStartDate(event.target.value)} required/></label>
        <label><span className='field-label'>終了日 <i className='required-symbol'>※</i></span><input type='date' name='endDate' min={startDate||undefined} required/></label><br/>
        <label className='full'><span className='field-label'>月間目標時間 <i className='required-symbol'>※</i></span><input type='number' name='targetHours' min='0' max='744' step='0.5' placeholder='例：80' required/></label>
      </div>
      </section>
      <section className='client-form-section'><div className='client-form-section-head'><h2>ラベルカラー</h2><p>カレンダーや案件一覧で使用します。プリセット以外の色も指定できます。</p></div><div className='project-color-section'>
        <fieldset className='project-color-picker'><legend>カラーを選択</legend>{presetColors.map(item=><label key={item} className={normalizedColor===item?'selected':''}><input type='radio' name='presetColor' value={item} checked={normalizedColor===item} onChange={()=>setColor(item)}/><span style={{background:item}}/><b>{item}</b></label>)}</fieldset>
        <label className='project-custom-color'><span className='field-label'>好きな色</span><span className='project-custom-color-control'><input className='project-native-color' type='color' value={colorPickerValue} onChange={event=>updateColor(event.target.value)} aria-label='好きな色を選択'/><input type='text' value={color} onChange={event=>updateColor(event.target.value)} maxLength={7} required aria-label='カラーコード'/></span><small className='field-help'>HEX形式で指定できます。例：#75A8C7</small></label>
        {isPresetSelected ? null : <div className='project-selected-custom-color'><span style={{background:colorPickerValue}}/>カスタムカラーを使用中</div>}
      </div></section>
      <div className='client-form-actions'><button type='button' onClick={onCancel}>キャンセル</button><button type='submit' disabled={!activeClients.length}>案件を登録</button></div>
    </form>
  </div>
}
