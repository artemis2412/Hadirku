import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Clock3, MessageCircle, Plus, Save, ShieldCheck, Smartphone, Users, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Organization = { id: string; name: string; organization_type: string; timezone: string }
type Person = { id: string; full_name: string; phone: string | null; guardian_name: string | null; guardian_phone: string | null }
type Consent = { id: string; person_id: string; recipient_type: string; phone_number: string; consent_status: string; consent_method: string; consented_at: string | null; revoked_at: string | null }
type Template = { id: string; template_key: string; display_name: string; provider_template_name: string | null; language_code: string; category: string; body_preview: string; approval_status: string; is_active: boolean }
type Message = { id: string; recipient_phone: string; recipient_type: string; template_name_snapshot: string; delivery_status: string; created_at: string; error_message: string | null }

const e164 = /^\+[1-9][0-9]{7,14}$/
const statusLabel: Record<string,string> = { pending:'Menunggu', opted_in:'Disetujui', opted_out:'Berhenti', draft:'Draft', submitted:'Diajukan', approved:'Disetujui Meta', rejected:'Ditolak', paused:'Dijeda', queued:'Antrean', sending:'Mengirim', sent:'Terkirim', delivered:'Diterima', read:'Dibaca', failed:'Gagal', cancelled:'Dibatalkan' }

export default function WhatsAppPage({ organization, userId }: { organization: Organization; userId: string }) {
  const [people,setPeople] = useState<Person[]>([])
  const [consents,setConsents] = useState<Consent[]>([])
  const [templates,setTemplates] = useState<Template[]>([])
  const [messages,setMessages] = useState<Message[]>([])
  const [settings,setSettings] = useState<{id:string;is_enabled:boolean;phone_number_id:string|null;business_account_id:string|null;display_phone_number:string|null;default_language:string}|null>(null)
  const [busy,setBusy] = useState(true)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [phoneNumberId,setPhoneNumberId] = useState('')
  const [businessAccountId,setBusinessAccountId] = useState('')
  const [displayPhone,setDisplayPhone] = useState('')
  const [defaultLanguage,setDefaultLanguage] = useState('id')
  const [enabled,setEnabled] = useState(false)
  const [personId,setPersonId] = useState('')
  const [recipientType,setRecipientType] = useState<'self'|'guardian'>('self')
  const [phone,setPhone] = useState('')
  const [consentStatus,setConsentStatus] = useState<'pending'|'opted_in'|'opted_out'>('pending')
  const [consentMethod,setConsentMethod] = useState('manual')
  const [consentText,setConsentText] = useState('')
  const [templateKey,setTemplateKey] = useState('')
  const [templateName,setTemplateName] = useState('')
  const [templateProviderName,setTemplateProviderName] = useState('')
  const [templateLanguage,setTemplateLanguage] = useState('id')
  const [templateCategory,setTemplateCategory] = useState('utility')
  const [templateBody,setTemplateBody] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setBusy(true); setError('')
    const [s,p,c,t,m] = await Promise.all([
      supabase.from('whatsapp_settings').select('id,is_enabled,phone_number_id,business_account_id,display_phone_number,default_language').eq('organization_id',organization.id).maybeSingle(),
      supabase.from('people').select('id,full_name,phone,guardian_name,guardian_phone').eq('organization_id',organization.id).eq('is_active',true).order('full_name'),
      supabase.from('whatsapp_consents').select('id,person_id,recipient_type,phone_number,consent_status,consent_method,consented_at,revoked_at').eq('organization_id',organization.id).order('updated_at',{ascending:false}),
      supabase.from('whatsapp_templates').select('id,template_key,display_name,provider_template_name,language_code,category,body_preview,approval_status,is_active').eq('organization_id',organization.id).order('created_at',{ascending:false}),
      supabase.from('whatsapp_messages').select('id,recipient_phone,recipient_type,template_name_snapshot,delivery_status,created_at,error_message').eq('organization_id',organization.id).order('created_at',{ascending:false}).limit(30)
    ])
    const firstError = s.error || p.error || c.error || t.error || m.error
    if (firstError) setError(firstError.message)
    if (s.data) {
      setSettings(s.data); setPhoneNumberId(s.data.phone_number_id??''); setBusinessAccountId(s.data.business_account_id??'')
      setDisplayPhone(s.data.display_phone_number??''); setDefaultLanguage(s.data.default_language??'id'); setEnabled(s.data.is_enabled)
    } else { setSettings(null); setPhoneNumberId(''); setBusinessAccountId(''); setDisplayPhone(''); setDefaultLanguage('id'); setEnabled(false) }
    setPeople((p.data??[]) as Person[]); setConsents((c.data??[]) as Consent[])
    setTemplates((t.data??[]) as Template[]); setMessages((m.data??[]) as Message[])
    setBusy(false)
  },[organization.id])
  useEffect(()=>{void load()},[load])

  function choosePerson(id:string,type:'self'|'guardian'=recipientType) {
    setPersonId(id)
    const person=people.find(p=>p.id===id)
    setPhone(type==='guardian'?(person?.guardian_phone??''):(person?.phone??''))
  }
  function changeRecipientType(value:'self'|'guardian') {
    setRecipientType(value)
    const person=people.find(p=>p.id===personId)
    setPhone(value==='guardian'?(person?.guardian_phone??''):(person?.phone??''))
  }

  async function saveSettings(e:FormEvent) {
    e.preventDefault(); if(!supabase)return
    setSaving(true);setError('');setNotice('')
    const payload={organization_id:organization.id,is_enabled:enabled,phone_number_id:phoneNumberId.trim()||null,business_account_id:businessAccountId.trim()||null,display_phone_number:displayPhone.trim()||null,default_language:defaultLanguage,created_by:settings?undefined:userId,updated_by:userId}
    const {error}=await supabase.from('whatsapp_settings').upsert(payload,{onConflict:'organization_id'})
    if(error)setError(error.message);else{setNotice('Pengaturan WhatsApp tersimpan. Pengiriman tetap terkunci sampai worker dan kredensial resmi siap.');await load()}
    setSaving(false)
  }

  async function saveConsent(e:FormEvent) {
    e.preventDefault();if(!supabase)return
    if(!personId){setError('Pilih anggota terlebih dahulu.');return}
    if(!e164.test(phone.trim())){setError('Nomor harus menggunakan format internasional E.164, contoh +6281234567890.');return}
    setSaving(true);setError('');setNotice('')
    const now=new Date().toISOString()
    const payload={organization_id:organization.id,person_id:personId,recipient_type:recipientType,phone_number:phone.trim(),consent_status:consentStatus,consent_method:consentMethod,consent_text:consentText.trim()||null,consented_at:consentStatus==='opted_in'?now:null,revoked_at:consentStatus==='opted_out'?now:null,created_by:userId}
    const {error}=await supabase.from('whatsapp_consents').upsert(payload,{onConflict:'organization_id,person_id,recipient_type,phone_number'})
    if(error)setError(error.message);else{setNotice('Status persetujuan penerima berhasil diperbarui.');setPersonId('');setPhone('');setConsentText('');setConsentStatus('pending');await load()}
    setSaving(false)
  }

  async function saveTemplate(e:FormEvent) {
    e.preventDefault();if(!supabase)return
    const key=templateKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'')
    if(key.length<2){setError('Kunci template minimal 2 karakter.');return}
    if(templateBody.trim().length<1){setError('Isi contoh template wajib diisi.');return}
    setSaving(true);setError('');setNotice('')
    const {error}=await supabase.from('whatsapp_templates').insert({organization_id:organization.id,template_key:key,display_name:templateName.trim(),provider_template_name:templateProviderName.trim()||null,language_code:templateLanguage,category:templateCategory,body_preview:templateBody.trim(),approval_status:'draft',created_by:userId})
    if(error)setError(error.message);else{setNotice('Draft template tersimpan. Ajukan dan tunggu persetujuan melalui WhatsApp Manager sebelum digunakan.');setTemplateKey('');setTemplateName('');setTemplateProviderName('');setTemplateBody('');await load()}
    setSaving(false)
  }

  const optedIn=consents.filter(c=>c.consent_status==='opted_in'&&!c.revoked_at).length
  const approved=templates.filter(t=>t.approval_status==='approved'&&t.is_active).length
  const sent=messages.filter(m=>['sent','delivered','read'].includes(m.delivery_status)).length
  return <>
    <section className="welcome-row"><div><p className="eyebrow">NOTIFIKASI RESMI</p><h1>WhatsApp Business</h1><p className="muted">Kelola persetujuan penerima, template, dan riwayat pesan {organization.name}.</p></div><span className="wa-locked"><ShieldCheck size={15}/> Pengiriman terkunci</span></section>
    <section className="stats-grid wa-stats">
      <article className="stat-card"><div className="stat-icon teal"><Users size={19}/></div><p>Penerima opt-in</p><strong>{optedIn}</strong><small>Persetujuan aktif</small></article>
      <article className="stat-card"><div className="stat-icon blue"><MessageCircle size={19}/></div><p>Template disetujui</p><strong>{approved}</strong><small>Siap setelah integrasi aktif</small></article>
      <article className="stat-card"><div className="stat-icon violet"><CheckCircle2 size={19}/></div><p>Pesan terkirim</p><strong>{sent}</strong><small>Sent, delivered, read</small></article>
    </section>
    {error&&<div className="form-error page-error">{error}</div>}{notice&&<div className="form-success page-success">{notice}</div>}
    {busy?<section className="panel"><div className="empty-state"><Loader2 className="spin"/> Memuat modul WhatsApp...</div></section>:<>
      <section className="panel wa-panel">
        <div className="panel-heading"><div><h2><Smartphone size={18}/> Koneksi WhatsApp Business</h2><p>Isi ID non-rahasia dari Meta Business Platform.</p></div><span className="wa-state">{settings?.is_enabled?'Diaktifkan di pengaturan':'Belum diaktifkan'}</span></div>
        <div className="wa-warning"><AlertCircle size={17}/><span>Token akses dan App Secret tidak disimpan di sini. Simpan hanya pada Supabase Edge Function Secrets. Tombol aktif tidak mengirim pesan sebelum worker resmi siap.</span></div>
        <form className="member-form wa-form" onSubmit={saveSettings}>
          <div className="form-two"><label>Phone Number ID<input value={phoneNumberId} onChange={e=>setPhoneNumberId(e.target.value)} placeholder="ID nomor dari Meta"/></label><label>WhatsApp Business Account ID<input value={businessAccountId} onChange={e=>setBusinessAccountId(e.target.value)} placeholder="WABA ID"/></label></div>
          <div className="form-two"><label>Nomor bisnis tampil<input value={displayPhone} onChange={e=>setDisplayPhone(e.target.value)} placeholder="+62..."/></label><label>Bahasa template<select value={defaultLanguage} onChange={e=>setDefaultLanguage(e.target.value)}><option value="id">Indonesia (id)</option><option value="en_US">English (US)</option></select></label></div>
          <label className="wa-toggle"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Tandai integrasi siap dikonfigurasi (belum mengaktifkan pengiriman)</label>
          <div className="modal-actions"><button className="primary-btn" disabled={saving}>{saving?<Loader2 className="spin" size={16}/>:<Save size={16}/>} Simpan pengaturan</button></div>
        </form>
      </section>

      <section className="panel wa-panel">
        <div className="panel-heading"><div><h2><ShieldCheck size={18}/> Persetujuan penerima</h2><p>Catat izin terpisah untuk anggota dan orang tua/wali.</p></div></div>
        <form className="member-form wa-form" onSubmit={saveConsent}>
          <label>Anggota *<select required value={personId} onChange={e=>choosePerson(e.target.value)}><option value="">Pilih anggota</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
          <div className="form-two"><label>Penerima<select value={recipientType} onChange={e=>changeRecipientType(e.target.value as 'self'|'guardian')}><option value="self">Anggota sendiri</option><option value="guardian">Orang tua / wali</option></select></label><label>Nomor WhatsApp *<input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+6281234567890"/></label></div>
          <div className="form-two"><label>Status persetujuan<select value={consentStatus} onChange={e=>setConsentStatus(e.target.value as 'pending'|'opted_in'|'opted_out')}><option value="pending">Menunggu persetujuan</option><option value="opted_in">Sudah memberi izin</option><option value="opted_out">Menolak / berhenti</option></select></label><label>Metode bukti<select value={consentMethod} onChange={e=>setConsentMethod(e.target.value)}><option value="manual">Dicatat petugas</option><option value="paper_form">Formulir tertulis</option><option value="web_form">Formulir digital</option><option value="whatsapp">Konfirmasi WhatsApp</option><option value="imported">Impor data</option></select></label></div>
          <label>Catatan / bukti persetujuan<textarea rows={2} value={consentText} onChange={e=>setConsentText(e.target.value)} placeholder="Contoh: Formulir persetujuan wali ditandatangani pada tanggal ..."/></label>
          <div className="wa-consent-note">Gunakan status “Sudah memberi izin” hanya setelah ada persetujuan yang jelas dan dapat dibuktikan. Permintaan berhenti harus segera dicatat sebagai opt-out.</div>
          <div className="modal-actions"><button className="primary-btn" disabled={saving||!people.length}>{saving?<Loader2 className="spin" size={16}/>:<Plus size={16}/>} Simpan persetujuan</button></div>
        </form>
        <div className="table-wrap"><table className="members-table"><thead><tr><th>Anggota</th><th>Penerima</th><th>Nomor</th><th>Persetujuan</th><th>Metode</th></tr></thead><tbody>{consents.map(c=><tr key={c.id}><td><b>{people.find(p=>p.id===c.person_id)?.full_name??'Anggota'}</b></td><td>{c.recipient_type==='guardian'?'Orang tua / wali':'Anggota'}</td><td>{c.phone_number}</td><td><span className={'member-status '+(c.consent_status==='opted_in'?'active':'inactive')}>{statusLabel[c.consent_status]??c.consent_status}</span></td><td>{c.consent_method}</td></tr>)}</tbody></table>{consents.length===0&&<div className="empty-state">Belum ada persetujuan yang dicatat.</div>}</div>
      </section>

      <section className="panel wa-panel">
        <div className="panel-heading"><div><h2><MessageCircle size={18}/> Template pesan</h2><p>Daftarkan template utility dan status persetujuan Meta.</p></div></div>
        <form className="member-form wa-form" onSubmit={saveTemplate}>
          <div className="form-two"><label>Kunci template *<input required value={templateKey} onChange={e=>setTemplateKey(e.target.value)} placeholder="contoh: absensi_harian"/></label><label>Nama template *<input required value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="Notifikasi presensi harian"/></label></div>
          <div className="form-two"><label>Nama persis di Meta (jika sudah ada)<input value={templateProviderName} onChange={e=>setTemplateProviderName(e.target.value)} placeholder="absensi_harian_id"/></label><label>Bahasa<select value={templateLanguage} onChange={e=>setTemplateLanguage(e.target.value)}><option value="id">Indonesia (id)</option><option value="en_US">English (US)</option></select></label></div>
          <label>Kategori<select value={templateCategory} onChange={e=>setTemplateCategory(e.target.value)}><option value="utility">Utility (informasi presensi)</option><option value="marketing">Marketing (perlu izin khusus)</option></select></label>
          <label>Contoh isi template *<textarea required rows={3} value={templateBody} onChange={e=>setTemplateBody(e.target.value)} placeholder="Halo {{1}}, presensi {{2}} pada {{3}}: {{4}}."/></label>
          <div className="wa-consent-note">Template baru disimpan sebagai draft. Status “Disetujui Meta” hanya boleh diberikan setelah statusnya benar-benar approved di WhatsApp Manager.</div>
          <div className="modal-actions"><button className="primary-btn" disabled={saving}>{saving?<Loader2 className="spin" size={16}/>:<Plus size={16}/>} Simpan draft template</button></div>
        </form>
        <div className="wa-template-list">{templates.map(t=><article className="wa-template" key={t.id}><div><b>{t.display_name}</b><small>{t.template_key} · {t.language_code} · {t.category}</small><p>{t.body_preview}</p></div><span className={'member-status '+(t.approval_status==='approved'?'active':'inactive')}>{statusLabel[t.approval_status]??t.approval_status}</span></article>)}{templates.length===0&&<div className="empty-state">Belum ada template. Tambahkan draft pertama di atas.</div>}</div>
      </section>

      <section className="panel wa-panel">
        <div className="panel-heading"><div><h2><Clock3 size={18}/> Riwayat pengiriman</h2><p>30 aktivitas terbaru dari antrean pesan.</p></div></div>
        <div className="table-wrap"><table className="members-table"><thead><tr><th>Penerima</th><th>Template</th><th>Status</th><th>Waktu</th></tr></thead><tbody>{messages.map(m=><tr key={m.id}><td>{m.recipient_phone}<small>{m.recipient_type==='guardian'?'Orang tua / wali':'Anggota'}</small></td><td>{m.template_name_snapshot}</td><td><span className={'member-status '+(['sent','delivered','read'].includes(m.delivery_status)?'active':'inactive')}>{statusLabel[m.delivery_status]??m.delivery_status}</span>{m.error_message&&<small>{m.error_message}</small>}</td><td>{new Date(m.created_at).toLocaleString('id-ID')}</td></tr>)}</tbody></table>{messages.length===0&&<div className="empty-state">Belum ada pesan. Antrean baru akan diaktifkan setelah worker resmi siap.</div>}</div>
      </section>
    </>}
  </>
}
