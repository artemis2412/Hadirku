import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, Users, CalendarCheck, ClipboardList, Building2, Settings, Bell, ChevronDown, Clock3, CheckCircle2, CircleAlert, Menu, LogOut, Plus, Loader2, ShieldCheck, Search, Pencil, Trash2, X, Save, Layers } from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

type Organization = { id: string; name: string; organization_type: string; timezone: string }
type Page = 'Ringkasan' | 'Organisasi' | 'Unit / Kelas' | 'Data Anggota' | 'Presensi' | 'Laporan' | 'Pengaturan'

const nav = [{label:'Ringkasan' as Page,icon:Activity},{label:'Organisasi' as Page,icon:Building2},{label:'Unit / Kelas' as Page,icon:Layers},{label:'Data Anggota' as Page,icon:Users},{label:'Presensi' as Page,icon:CalendarCheck},{label:'Laporan' as Page,icon:ClipboardList}]
const orgTypes = [{value:'school',label:'Sekolah'},{value:'foundation',label:'Yayasan'},{value:'pesantren',label:'Pesantren'},{value:'company',label:'Perusahaan'},{value:'course',label:'Kursus'},{value:'community',label:'Komunitas'},{value:'other',label:'Organisasi Lainnya'}]

function AuthScreen({ onDone }: { onDone: () => void }) {
  const [mode,setMode] = useState<'login'|'register'|'reset'>('login')
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!supabase) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'register') {
        const {data,error} = await supabase.auth.signUp({email,password,options:{data:{full_name:name,display_name:name}}})
        if(error) throw error
        if(data.session) onDone()
        else setMessage('Pendaftaran berhasil. Silakan periksa email untuk verifikasi sebelum masuk.')
      } else if (mode === 'reset') {
        const {error} = await supabase.auth.resetPasswordForEmail(email)
        if(error) throw error
        setMessage('Jika email terdaftar, tautan pemulihan akan dikirim ke kotak masuk Anda.')
      } else {
        const {error} = await supabase.auth.signInWithPassword({email,password})
        if(error) throw error
        onDone()
      }
    } catch(err) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.') }
    finally { setBusy(false) }
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><div className="brand-mark"><CalendarCheck size={22}/></div><div><strong>HADIRKU</strong><small>Attendance Platform</small></div></div>
    <p className="eyebrow">SATU PLATFORM, SEMUA ORGANISASI</p>
    <h1>{mode==='login'?'Selamat datang kembali':mode==='register'?'Buat akun HADIRKU':'Pulihkan kata sandi'}</h1>
    <p className="auth-sub">{mode==='login'?'Masuk untuk mengelola kehadiran organisasi Anda.':mode==='register'?'Daftar untuk mulai membangun workspace presensi.':'Kami akan mengirim tautan pemulihan ke email Anda.'}</p>
    <form onSubmit={submit}>
      {mode==='register' && <label>Nama lengkap<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nama Anda"/></label>}
      <label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></label>
      {mode!=='reset' && <label>Kata sandi<input required minLength={6} type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/></label>}
      {error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}
      <button className="primary-btn" disabled={busy}>{busy?<Loader2 className="spin" size={17}/>:null}{mode==='login'?'Masuk':mode==='register'?'Daftar akun':'Kirim tautan pemulihan'}</button>
    </form>
    <div className="auth-links">
      {mode==='login' && <><button onClick={()=>{setMode('register');setError('');setMessage('')}}>Belum punya akun? Daftar</button><button onClick={()=>{setMode('reset');setError('');setMessage('')}}>Lupa kata sandi?</button></>}
      {mode!=='login' && <button onClick={()=>{setMode('login');setError('');setMessage('')}}>Kembali ke halaman masuk</button>}
    </div>
    <div className="auth-security"><ShieldCheck size={15}/> Data organisasi dilindungi dengan akses berbasis peran.</div>
  </section></main>
}


type Person = { id:string; full_name:string; external_code:string|null; person_type:string; email:string|null; phone:string|null; guardian_name:string|null; guardian_phone:string|null; unit_id:string|null; is_active:boolean; notes:string|null }
type Unit = { id:string; name:string; unit_type:string }
function MembersPage({organization,userId}:{organization:Organization;userId:string}) {
  const [people,setPeople]=useState<Person[]>([])
  const [units,setUnits]=useState<Unit[]>([])
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('all')
  const [busy,setBusy]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [showForm,setShowForm]=useState(false)
  const [editing,setEditing]=useState<string|null>(null)
  const blank={full_name:'',external_code:'',person_type:'student',email:'',phone:'',guardian_name:'',guardian_phone:'',unit_id:'',notes:''}
  const [form,setForm]=useState(blank)
  const load=useCallback(async()=>{
    if(!supabase)return
    setBusy(true);setError('')
    const [p,u]=await Promise.all([
      supabase.from('people').select('id,full_name,external_code,person_type,email,phone,guardian_name,guardian_phone,unit_id,is_active,notes').eq('organization_id',organization.id).order('full_name'),
      supabase.from('organization_units').select('id,name,unit_type').eq('organization_id',organization.id).eq('is_active',true).order('name')
    ])
    if(p.error)setError(p.error.message);else setPeople((p.data??[]) as Person[])
    if(u.error)setError(u.error.message);else setUnits((u.data??[]) as Unit[])
    setBusy(false)
  },[organization.id])
  useEffect(()=>{void load()},[load])
  function openNew(){setEditing(null);setForm(blank);setShowForm(true);setError('')}
  function openEdit(p:Person){setEditing(p.id);setForm({full_name:p.full_name,external_code:p.external_code??'',person_type:p.person_type,email:p.email??'',phone:p.phone??'',guardian_name:p.guardian_name??'',guardian_phone:p.guardian_phone??'',unit_id:p.unit_id??'',notes:p.notes??''});setShowForm(true);setError('')}
  async function save(e:FormEvent){
    e.preventDefault();if(!supabase)return
    setSaving(true);setError('')
    const payload={full_name:form.full_name.trim(),external_code:form.external_code.trim()||null,person_type:form.person_type,email:form.email.trim()||null,phone:form.phone.trim()||null,guardian_name:form.guardian_name.trim()||null,guardian_phone:form.guardian_phone.trim()||null,unit_id:form.unit_id||null,notes:form.notes.trim()||null,is_active:true}
    const result=editing
      ? await supabase.from('people').update(payload).eq('id',editing).eq('organization_id',organization.id)
      : await supabase.from('people').insert({...payload,organization_id:organization.id,created_by:userId})
    if(result.error){setError(result.error.message);setSaving(false);return}
    setShowForm(false);setSaving(false);await load()
  }
  async function remove(p:Person){
    if(!supabase||!window.confirm('Hapus data anggota '+p.full_name+'? Data presensi terkait juga dapat terhapus sesuai aturan database.'))return
    const {error}=await supabase.from('people').delete().eq('id',p.id).eq('organization_id',organization.id)
    if(error)setError(error.message);else await load()
  }
  const filtered=people.filter(p=>(filter==='all'||(filter==='active'?p.is_active:!p.is_active))&&[p.full_name,p.external_code??'',p.phone??'',p.email??''].join(' ').toLowerCase().includes(search.toLowerCase()))
  const types:[string,string][]=[['student','Siswa'],['employee','Karyawan'],['teacher','Guru'],['member','Anggota'],['volunteer','Relawan'],['other','Lainnya']]
  return <><section className="welcome-row"><div><p className="eyebrow">DATABASE ORGANISASI</p><h1>Data Anggota</h1><p className="muted">Kelola siswa, karyawan, guru, dan anggota {organization.name}.</p></div><button className="primary-btn" onClick={openNew}><Plus size={17}/> Tambah anggota</button></section>
    <section className="stats-grid member-stats"><Stat icon={Users} label="Total anggota" value={String(people.length)} note="Seluruh data anggota" color="teal"/><Stat icon={CheckCircle2} label="Aktif" value={String(people.filter(p=>p.is_active).length)} note="Anggota aktif" color="blue"/><Stat icon={CircleAlert} label="Nonaktif" value={String(people.filter(p=>!p.is_active).length)} note="Anggota nonaktif" color="amber"/></section>
    <section className="panel members-panel"><div className="members-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, kode, telepon..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>
      {error&&<div className="form-error">{error}</div>}
      {busy?<div className="empty-state"><Loader2 className="spin" size={18}/> Memuat data anggota...</div>:filtered.length===0?<div className="empty-state"><Users size={25}/><b>{people.length?'Tidak ada anggota yang cocok':'Belum ada data anggota'}</b><span>{people.length?'Ubah kata kunci atau filter pencarian.':'Tambahkan data anggota pertama organisasi Anda.'}</span></div>:
      <div className="table-wrap"><table className="members-table"><thead><tr><th>Nama anggota</th><th>Kategori</th><th>Unit / Kelas</th><th>Kontak</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><b>{p.full_name}</b><small>{p.external_code||'Tanpa kode'}</small></td><td>{types.find(t=>t[0]===p.person_type)?.[1]??'Lainnya'}</td><td>{units.find(u=>u.id===p.unit_id)?.name??'—'}</td><td>{p.phone||p.email||'—'}</td><td><span className={p.is_active?'member-status active':'member-status inactive'}>{p.is_active?'Aktif':'Nonaktif'}</span></td><td><div className="row-actions"><button title="Edit" onClick={()=>openEdit(p)}><Pencil size={15}/></button><button title="Hapus" onClick={()=>void remove(p)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
      <div className="table-foot">Menampilkan {filtered.length} dari {people.length} anggota</div>
    </section>
    {showForm&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><section className="member-modal"><div className="modal-heading"><div><p className="eyebrow">{editing?'PERBARUI DATA':'DATA BARU'}</p><h2>{editing?'Edit anggota':'Tambah anggota'}</h2></div><button className="icon-button" onClick={()=>setShowForm(false)}><X size={19}/></button></div><form onSubmit={save} className="member-form">
      <label>Nama lengkap *<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Nama lengkap"/></label>
      <div className="form-two"><label>Kode anggota<input value={form.external_code} onChange={e=>setForm({...form,external_code:e.target.value})} placeholder="NIS / NIP / ID"/></label><label>Kategori<select value={form.person_type} onChange={e=>setForm({...form,person_type:e.target.value})}>{types.map(t=><option value={t[0]} key={t[0]}>{t[1]}</option>)}</select></label></div>
      <label>Unit / kelas / divisi<select value={form.unit_id} onChange={e=>setForm({...form,unit_id:e.target.value})}><option value="">Belum ditentukan</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <div className="form-two"><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@contoh.com"/></label><label>Nomor telepon<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="08xxxxxxxxxx"/></label></div>
      <div className="form-two"><label>Nama orang tua / wali<input value={form.guardian_name} onChange={e=>setForm({...form,guardian_name:e.target.value})} placeholder="Opsional"/></label><label>Telepon wali<input value={form.guardian_phone} onChange={e=>setForm({...form,guardian_phone:e.target.value})} placeholder="Opsional"/></label></div>
      <label>Catatan<textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Catatan tambahan (opsional)"/></label>
      {error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowForm(false)}>Batal</button><button className="primary-btn" disabled={saving}>{saving?<Loader2 className="spin" size={16}/>:<Save size={16}/>} Simpan anggota</button></div>
    </form></section></div>}
  </>
}


function UnitsPage({organization,userId}:{organization:Organization;userId:string}) {
  const [units,setUnits]=useState<Unit[]>([])
  const [busy,setBusy]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [showForm,setShowForm]=useState(false)
  const [editing,setEditing]=useState<string|null>(null)
  const [name,setName]=useState('')
  const [unitType,setUnitType]=useState('class')
  const [description,setDescription]=useState('')
  const labels:Record<string,string>={class:'Kelas',department:'Departemen',division:'Divisi',team:'Tim',group:'Kelompok',branch:'Cabang',general:'Umum'}
  const load=useCallback(async()=>{
    if(!supabase)return
    setBusy(true);setError('')
    const {data,error}=await supabase.from('organization_units').select('id,name,unit_type,is_active,description').eq('organization_id',organization.id).order('name')
    if(error)setError(error.message);else setUnits((data??[]) as Unit[])
    setBusy(false)
  },[organization.id])
  useEffect(()=>{void load()},[load])
  function start(unit?:Unit){setEditing(unit?.id??null);setName(unit?.name??'');setUnitType(unit?.unit_type??'class');setDescription((unit as any)?.description??'');setShowForm(true);setError('')}
  async function save(e:FormEvent){
    e.preventDefault();if(!supabase)return
    setSaving(true);setError('')
    const payload={name:name.trim(),unit_type:unitType,description:description.trim()||null,is_active:true}
    const result=editing?await supabase.from('organization_units').update(payload).eq('id',editing).eq('organization_id',organization.id):await supabase.from('organization_units').insert({...payload,organization_id:organization.id,created_by:userId})
    if(result.error){setError(result.error.message);setSaving(false);return}
    setShowForm(false);setSaving(false);await load()
  }
  async function toggle(unit:Unit & {is_active?:boolean}){
    if(!supabase)return
    const {error}=await supabase.from('organization_units').update({is_active:!unit.is_active}).eq('id',unit.id).eq('organization_id',organization.id)
    if(error)setError(error.message);else await load()
  }
  return <><section className="welcome-row"><div><p className="eyebrow">STRUKTUR ORGANISASI</p><h1>Unit / Kelas</h1><p className="muted">Kelompokkan anggota berdasarkan kelas, divisi, tim, atau cabang.</p></div><button className="primary-btn" onClick={()=>start()}><Plus size={17}/> Tambah unit</button></section>
    <section className="panel org-list"><div className="panel-heading"><div><h2>Daftar unit organisasi</h2><p>{units.length} unit terdaftar · {units.filter(u=>(u as any).is_active).length} aktif</p></div></div>{error&&<div className="form-error">{error}</div>}
      {busy?<div className="empty-state"><Loader2 className="spin"/> Memuat unit...</div>:units.length===0?<div className="empty-state"><Layers size={25}/><b>Belum ada unit atau kelas</b><span>Buat unit pertama untuk mengelompokkan anggota.</span></div>:units.map(unit=><div className="unit-row" key={unit.id}><div className="unit-icon"><Layers size={18}/></div><div className="unit-details"><b>{unit.name}</b><small>{labels[unit.unit_type]??'Umum'}{(unit as any).description?' · '+(unit as any).description:''}</small></div><span className={(unit as any).is_active?'member-status active':'member-status inactive'}>{(unit as any).is_active?'Aktif':'Nonaktif'}</span><div className="row-actions"><button title="Edit" onClick={()=>start(unit)}><Pencil size={15}/></button><button title={(unit as any).is_active?'Nonaktifkan':'Aktifkan'} onClick={()=>void toggle(unit as any)}>{(unit as any).is_active?<X size={15}/>:<CheckCircle2 size={15}/>}</button></div></div>)}
    </section>
    {showForm&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><section className="member-modal"><div className="modal-heading"><div><p className="eyebrow">STRUKTUR ORGANISASI</p><h2>{editing?'Edit unit':'Tambah unit baru'}</h2></div><button className="icon-button" onClick={()=>setShowForm(false)}><X size={19}/></button></div><form className="member-form" onSubmit={save}><label>Nama unit / kelas *<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Kelas 7A / Divisi Keuangan"/></label><label>Jenis unit<select value={unitType} onChange={e=>setUnitType(e.target.value)}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Deskripsi<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Keterangan tambahan (opsional)"/></label>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowForm(false)}>Batal</button><button className="primary-btn" disabled={saving}>{saving?<Loader2 className="spin"/>:<Save size={16}/>} Simpan unit</button></div></form></section></div>}
  </>
}


type SessionRow={id:string;title:string;attendance_date:string;unit_id:string|null;session_status:string}
type StatusRow={id:string;code:string;label:string;is_present:boolean;is_excused:boolean;sort_order:number}
function AttendancePage({organization,userId}:{organization:Organization;userId:string}) {
  const [sessions,setSessions]=useState<SessionRow[]>([])
  const [units,setUnits]=useState<Unit[]>([])
  const [people,setPeople]=useState<Person[]>([])
  const [statuses,setStatuses]=useState<StatusRow[]>([])
  const [marks,setMarks]=useState<Record<string,string>>({})
  const [existing,setExisting]=useState<Record<string,string>>({})
  const [active,setActive]=useState<SessionRow|null>(null)
  const [busy,setBusy]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [showCreate,setShowCreate]=useState(false)
  const [title,setTitle]=useState('Presensi Harian')
  const [date,setDate]=useState(new Intl.DateTimeFormat('en-CA',{timeZone:organization.timezone}).format(new Date()))
  const [unitId,setUnitId]=useState('')
  const loadSessions=useCallback(async()=>{
    if(!supabase)return
    setBusy(true);setError('')
    const [s,u,st]=await Promise.all([
      supabase.from('attendance_sessions').select('id,title,attendance_date,unit_id,session_status').eq('organization_id',organization.id).order('attendance_date',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('organization_units').select('id,name,unit_type').eq('organization_id',organization.id).eq('is_active',true).order('name'),
      supabase.from('attendance_statuses').select('id,code,label,is_present,is_excused,sort_order').eq('organization_id',organization.id).eq('is_active',true).order('sort_order')
    ])
    if(s.error)setError(s.error.message);else setSessions((s.data??[]) as SessionRow[])
    if(u.error)setError(u.error.message);else setUnits((u.data??[]) as Unit[])
    if(st.error)setError(st.error.message);else setStatuses((st.data??[]) as StatusRow[])
    setBusy(false)
  },[organization.id])
  useEffect(()=>{void loadSessions()},[loadSessions])
  async function createSession(e:FormEvent){
    e.preventDefault();if(!supabase)return
    setSaving(true);setError('')
    const {data,error}=await supabase.from('attendance_sessions').insert({organization_id:organization.id,title:title.trim(),attendance_date:date,unit_id:unitId||null,created_by:userId}).select('id,title,attendance_date,unit_id,session_status').single()
    if(error){setError(error.message);setSaving(false);return}
    setShowCreate(false);setSaving(false);setTitle('Presensi Harian');await loadSessions();if(data)void openSession(data as SessionRow)
  }
  async function openSession(session:SessionRow){
    if(!supabase)return
    setActive(session);setBusy(true);setError('')
    let peopleQuery=supabase.from('people').select('id,full_name,external_code,person_type,email,phone,guardian_name,guardian_phone,unit_id,is_active,notes').eq('organization_id',organization.id).eq('is_active',true).order('full_name')
    if(session.unit_id)peopleQuery=peopleQuery.eq('unit_id',session.unit_id)
    const [p,r]=await Promise.all([
      peopleQuery,
      supabase.from('attendance_records').select('person_id,status_id').eq('organization_id',organization.id).eq('session_id',session.id)
    ])
    if(p.error)setError(p.error.message);else setPeople((p.data??[]) as Person[])
    if(r.error)setError(r.error.message);else{
      const ex:Record<string,string>={},mk:Record<string,string>={}
      ;(r.data??[]).forEach(row=>{ex[row.person_id]=row.status_id;mk[row.person_id]=row.status_id})
      setExisting(ex);setMarks(mk)
    }
    setBusy(false)
  }
  async function saveMarks(){
    if(!supabase||!active)return
    setSaving(true);setError('')
    for(const person of people){
      const statusId=marks[person.id]
      if(!statusId)continue
      const payload={status_id:statusId,marked_by:userId,marked_at:new Date().toISOString()}
      const result=existing[person.id]
        ?await supabase.from('attendance_records').update(payload).eq('organization_id',organization.id).eq('session_id',active.id).eq('person_id',person.id)
        :await supabase.from('attendance_records').insert({...payload,organization_id:organization.id,session_id:active.id,person_id:person.id})
      if(result.error){setError('Gagal menyimpan '+person.full_name+': '+result.error.message);setSaving(false);return}
    }
    setSaving(false);await openSession(active)
  }
  async function closeSession(){
    if(!supabase||!active)return
    const {error}=await supabase.from('attendance_sessions').update({session_status:'closed'}).eq('id',active.id).eq('organization_id',organization.id)
    if(error){setError(error.message);return}
    setActive(null);await loadSessions()
  }
  const countMarked=people.filter(p=>!!marks[p.id]).length
  const countPresent=people.filter(p=>statuses.find(s=>s.id===marks[p.id])?.is_present).length
  return <><section className="welcome-row"><div><p className="eyebrow">PENCATATAN KEHADIRAN</p><h1>Presensi</h1><p className="muted">Buat sesi dan catat status kehadiran anggota.</p></div><button className="primary-btn" onClick={()=>{setShowCreate(true);setError('')}}><Plus size={17}/> Buat sesi</button></section>
    {error&&<div className="form-error page-error">{error}</div>}
    {active?<section className="panel attendance-panel"><div className="attendance-head"><div><button className="back-link" onClick={()=>setActive(null)}>← Semua sesi</button><h2>{active.title}</h2><p>{active.attendance_date} · {active.unit_id?units.find(u=>u.id===active.unit_id)?.name??'Unit':'Seluruh anggota'}</p></div><div className="attendance-actions"><span className="member-status active">{countMarked}/{people.length} tercatat</span><button className="secondary-btn" onClick={()=>void closeSession()} disabled={active.session_status==='closed'}>Tutup sesi</button></div></div>
      <div className="attendance-summary"><div><b>{people.length}</b><small>Anggota</small></div><div><b>{countPresent}</b><small>Hadir</small></div><div><b>{countMarked-countPresent}</b><small>Belum hadir / lainnya</small></div></div>
      {busy?<div className="empty-state"><Loader2 className="spin"/> Memuat daftar anggota...</div>:people.length===0?<div className="empty-state"><Users size={25}/><b>Belum ada anggota di sesi ini</b><span>Tambahkan anggota aktif atau pilih unit yang sesuai.</span></div>:<div className="table-wrap"><table className="members-table attendance-table"><thead><tr><th>Nama anggota</th><th>Status kehadiran</th></tr></thead><tbody>{people.map(p=><tr key={p.id}><td><b>{p.full_name}</b><small>{p.external_code||'Tanpa kode'}</small></td><td><select className="attendance-select" value={marks[p.id]??''} disabled={active.session_status==='closed'} onChange={e=>setMarks({...marks,[p.id]:e.target.value})}><option value="">Pilih status</option>{statuses.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></td></tr>)}</tbody></table></div>}
      <div className="attendance-footer"><span>{active.session_status==='closed'?'Sesi sudah ditutup':'Perubahan belum tersimpan sampai tombol simpan ditekan.'}</span><button className="primary-btn" disabled={saving||active.session_status==='closed'||people.length===0} onClick={()=>void saveMarks()}>{saving?<Loader2 className="spin"/>:<Save size={16}/>} Simpan presensi</button></div>
    </section>:<section className="panel org-list"><div className="panel-heading"><div><h2>Riwayat sesi presensi</h2><p>{sessions.length} sesi tercatat</p></div></div>
      {busy?<div className="empty-state"><Loader2 className="spin"/> Memuat sesi...</div>:sessions.length===0?<div className="empty-state"><CalendarCheck size={25}/><b>Belum ada sesi presensi</b><span>Buat sesi pertama untuk mulai mencatat kehadiran.</span></div>:sessions.map(s=><button className="session-row" key={s.id} onClick={()=>void openSession(s)}><div className="unit-icon"><CalendarCheck size={18}/></div><div className="unit-details"><b>{s.title}</b><small>{s.attendance_date} · {s.unit_id?units.find(u=>u.id===s.unit_id)?.name??'Unit':'Seluruh anggota'}</small></div><span className={s.session_status==='open'?'member-status active':'member-status inactive'}>{s.session_status==='open'?'Terbuka':s.session_status==='closed'?'Ditutup':s.session_status}</span><span className="session-arrow">→</span></button>)}
    </section>}
    {showCreate&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setShowCreate(false)}}><section className="member-modal"><div className="modal-heading"><div><p className="eyebrow">SESI BARU</p><h2>Buat sesi presensi</h2></div><button className="icon-button" onClick={()=>setShowCreate(false)}><X size={19}/></button></div><form className="member-form" onSubmit={createSession}><label>Nama sesi *<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Presensi Pagi"/></label><label>Tanggal presensi *<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Unit / kelas<select value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">Seluruh anggota</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowCreate(false)}>Batal</button><button className="primary-btn" disabled={saving||!title.trim()}>{saving?<Loader2 className="spin"/>:<Plus size={16}/>} Buat sesi</button></div></form></section></div>}
  </>
}

function App() {
  const [user,setUser] = useState<User|null>(null)
  const [authLoading,setAuthLoading] = useState(true)
  const [organizations,setOrganizations] = useState<Organization[]>([])
  const [organization,setOrganization] = useState<Organization|null>(null)
  const [page,setPage] = useState<Page>('Ringkasan')
  const [menuOpen,setMenuOpen] = useState(false)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [peopleCount,setPeopleCount] = useState(0)
  const [sessionCount,setSessionCount] = useState(0)
  const [orgName,setOrgName] = useState('')
  const [orgType,setOrgType] = useState('school')
  const [creating,setCreating] = useState(false)

  useEffect(()=>{
    if(!supabase){setAuthLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setUser(data.session?.user??null);setAuthLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null)})
    return ()=>subscription.unsubscribe()
  },[])

  const loadOrganizations = useCallback(async()=>{
    if(!supabase||!user)return
    setLoading(true);setError('')
    const {data:memberships,error:memberError}=await supabase.from('organization_memberships').select('organization_id').eq('user_id',user.id).eq('membership_status','active')
    if(memberError){setError(memberError.message);setLoading(false);return}
    const ids=(memberships??[]).map(m=>m.organization_id)
    if(!ids.length){setOrganizations([]);setOrganization(null);setLoading(false);return}
    const {data:orgs,error:orgError}=await supabase.from('organizations').select('id,name,organization_type,timezone').in('id',ids).eq('is_active',true).order('name')
    if(orgError){setError(orgError.message);setLoading(false);return}
    const list=(orgs??[]) as Organization[]
    setOrganizations(list)
    setOrganization(current=>current&&list.some(o=>o.id===current.id)?list.find(o=>o.id===current.id)??null:list[0]??null)
    setLoading(false)
  },[user])

  useEffect(()=>{if(user)void loadOrganizations();else{setOrganizations([]);setOrganization(null)}},[user,loadOrganizations])

  useEffect(()=>{
    async function loadStats(){
      if(!supabase||!organization)return
      const [people,sessions]=await Promise.all([
        supabase.from('people').select('id',{count:'exact',head:true}).eq('organization_id',organization.id).eq('is_active',true),
        supabase.from('attendance_sessions').select('id',{count:'exact',head:true}).eq('organization_id',organization.id)
      ])
      setPeopleCount(people.count??0);setSessionCount(sessions.count??0)
    }
    void loadStats()
  },[organization])

  async function createOrganization(e:FormEvent){
    e.preventDefault();if(!supabase)return
    setCreating(true);setError('')
    const {data,error}=await supabase.rpc('create_organization',{p_name:orgName.trim(),p_organization_type:orgType,p_timezone:'Asia/Makassar'})
    if(error){setError(error.message);setCreating(false);return}
    await loadOrganizations()
    if(data){const {data:org}=await supabase.from('organizations').select('id,name,organization_type,timezone').eq('id',data).single();if(org){setOrganization(org as Organization);setPage('Ringkasan')}}
    setOrgName('');setCreating(false)
  }
  async function logout(){if(supabase)await supabase.auth.signOut()}
  const displayName=user?.user_metadata?.display_name||user?.email?.split('@')[0]||'Pengguna'

  if(!isSupabaseConfigured)return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><div className="brand-mark"><CalendarCheck/></div><strong>HADIRKU</strong></div><h1>Konfigurasi diperlukan</h1><p className="auth-sub">Tambahkan URL Supabase dan publishable key ke file <code>web/.env.local</code> untuk mengaktifkan login.</p><pre>VITE_SUPABASE_URL=https://qmmdhjjezuflznapalbo.supabase.co{ '\n' }VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...</pre></section></main>
  if(authLoading)return <main className="loading-screen"><Loader2 className="spin"/> Memuat HADIRKU...</main>
  if(!user)return <AuthScreen onDone={()=>{}}/>

  return <div className="app-shell">
    <aside className={menuOpen?'sidebar open':'sidebar'}>
      <div className="brand"><div className="brand-mark"><CalendarCheck size={21}/></div><div><strong>HADIRKU</strong><small>Attendance Platform</small></div></div>
      {organization?<div className="org-switch"><div className="org-avatar">{organization.name.slice(0,1).toUpperCase()}</div><div className="org-switch-text"><b>{organization.name}</b><small>{organization.organization_type}</small></div><ChevronDown size={16}/></div>:<div className="org-switch"><div className="org-avatar">+</div><div className="org-switch-text"><b>Belum ada organisasi</b><small>Buat workspace pertama</small></div></div>}
      <p className="nav-caption">MENU UTAMA</p>
      <nav>{nav.map(item=><button key={item.label} className={page===item.label?'nav-item selected':'nav-item'} onClick={()=>{setPage(item.label);setMenuOpen(false)}}><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className={'nav-item '+(page==='Pengaturan'?'selected':'')} onClick={()=>setPage('Pengaturan')}><Settings size={18}/>Pengaturan</button><div className="help-card"><b>HADIRKU untuk semua</b><p>Kelola kehadiran sekolah, pesantren, perusahaan, kursus, dan komunitas.</p></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><button className="icon-button" title="Notifikasi"><Bell size={18}/></button><div className="profile"><div className="profile-avatar">{displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><small>{user.email}</small></div><button className="icon-button" onClick={logout} title="Keluar"><LogOut size={17}/></button></div></div></header>
      <div className="content">
        {error&&<div className="form-error page-error">{error}</div>}
        {page==='Presensi'&&organization?<AttendancePage organization={organization} userId={user.id}/>:page==='Data Anggota'&&organization?<MembersPage organization={organization} userId={user.id}/>:page==='Unit / Kelas'&&organization?<UnitsPage organization={organization} userId={user.id}/>:page==='Organisasi'?<><section className="welcome-row"><div><p className="eyebrow">WORKSPACE ORGANISASI</p><h1>Organisasi Anda</h1><p className="muted">Kelola ruang kerja yang terhubung dengan akun ini.</p></div></section>
          <section className="panel org-panel"><div className="panel-heading"><div><h2>Buat organisasi baru</h2><p>Setiap organisasi memiliki data dan akses yang terpisah.</p></div><Building2 size={22}/></div><form className="org-form" onSubmit={createOrganization}><label>Nama organisasi<input required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Contoh: SMP Harapan Bangsa"/></label><label>Jenis organisasi<select value={orgType} onChange={e=>setOrgType(e.target.value)}>{orgTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><button className="primary-btn" disabled={creating||!orgName.trim()}>{creating?<Loader2 className="spin" size={17}/>:<Plus size={17}/>} Buat organisasi</button></form></section>
          <section className="panel org-list"><div className="panel-heading"><div><h2>Daftar organisasi</h2><p>{organizations.length} organisasi terhubung</p></div></div>{organizations.length?organizations.map(o=><button className={'org-list-item '+(organization?.id===o.id?'current':'')} key={o.id} onClick={()=>{setOrganization(o);setPage('Ringkasan')}}><div className="org-avatar">{o.name.slice(0,1).toUpperCase()}</div><div><b>{o.name}</b><small>{o.organization_type} · {o.timezone}</small></div><span>{organization?.id===o.id?'Sedang aktif':'Buka workspace →'}</span></button>):<p className="empty-state">Belum ada organisasi. Buat organisasi pertama untuk memulai.</p>}</section>
        </>:!organization?<section className="empty-org"><div className="empty-icon"><Building2 size={28}/></div><p className="eyebrow">MULAI DARI SINI</p><h1>Buat workspace organisasi</h1><p>Tambahkan organisasi pertama agar Anda dapat mengelola anggota dan presensi.</p><button className="primary-btn" onClick={()=>setPage('Organisasi')}><Plus size={17}/> Buat organisasi</button></section>
        :page==='Ringkasan'?<><section className="welcome-row"><div><p className="eyebrow">DASHBOARD ORGANISASI</p><h1>Selamat datang, {displayName}</h1><p className="muted">Ringkasan aktivitas <b>{organization.name}</b>.</p></div><div className="date-chip"><Clock3 size={16}/> {organization.timezone}</div></section>
          <section className="notice"><div className="notice-icon"><CircleAlert size={19}/></div><div><b>Workspace {organization.name} aktif</b><p>Mulai dengan menambahkan data anggota dan membuat sesi presensi.</p></div><button onClick={()=>setPage('Data Anggota')}>Kelola anggota →</button></section>
          <section className="stats-grid"><Stat icon={Users} label="Total Anggota" value={String(peopleCount)} note="Anggota aktif" color="teal"/><Stat icon={CalendarCheck} label="Sesi Presensi" value={String(sessionCount)} note="Total sesi tercatat" color="blue"/><Stat icon={Clock3} label="Hadir Hari Ini" value="—" note="Ringkasan presensi menyusul" color="amber"/><Stat icon={CheckCircle2} label="Tingkat Kehadiran" value="—" note="Akan dihitung dari data presensi" color="violet"/></section>
          <section className="section-heading"><div><h2>Modul HADIRKU</h2><p>Pilih bagian yang ingin Anda kelola.</p></div></section><section className="module-grid">{[{title:'Data Organisasi',desc:'Profil dan unit organisasi',icon:Building2,target:'Organisasi' as Page,color:'teal'},{title:'Data Anggota',desc:'Siswa, karyawan, guru, anggota',icon:Users,target:'Data Anggota' as Page,color:'blue'},{title:'Presensi',desc:'Catat kehadiran harian',icon:CalendarCheck,target:'Presensi' as Page,color:'violet'},{title:'Laporan',desc:'Rekap dan ekspor kehadiran',icon:ClipboardList,target:'Laporan' as Page,color:'amber'}].map(m=><button className="module-card" key={m.title} onClick={()=>setPage(m.target)}><div className={'module-icon '+m.color}><m.icon size={21}/></div><div><b>{m.title}</b><p>{m.desc}</p></div><span className="arrow">→</span></button>)}</section>
          <section className="lower-grid"><article className="panel"><div className="panel-heading"><div><h2>Langkah berikutnya</h2><p>Persiapan awal organisasi</p></div><span className="pill">3 langkah</span></div>{['Lengkapi profil organisasi','Tambahkan data anggota','Buat sesi presensi pertama'].map((s,i)=><div className="activity-row" key={s}><div className="step-number">{i+1}</div><div className="activity-info"><b>{s}</b><small>{i===0?'Periksa informasi organisasi':i===1?'Masukkan data siswa atau karyawan':'Mulai pencatatan kehadiran'}</small></div><span className="status">{i===0?'Tersedia':'Berikutnya'}</span></div>)}</article><article className="panel tip-panel"><div className="tip-symbol"><Activity size={22}/></div><h2>Satu platform, banyak kebutuhan</h2><p>HADIRKU dirancang fleksibel untuk sekolah, pesantren, yayasan, perusahaan, kursus, dan komunitas.</p><div className="tip-footer">HADIRKU <span>•</span> Attendance made simple</div></article></section>
        </>:<section className="empty-org"><div className="empty-icon"><ClipboardList size={27}/></div><p className="eyebrow">MODUL BERIKUTNYA</p><h1>{page}</h1><p>Workspace sudah terhubung. Modul {page.toLowerCase()} sedang disiapkan agar terhubung penuh dengan database.</p><button className="secondary-btn" onClick={()=>setPage('Ringkasan')}>Kembali ke ringkasan</button></section>}
        <footer>© 2026 HADIRKU. Platform presensi untuk semua organisasi.</footer>
      </div>
    </main>
  </div>
}
function Stat({icon:Icon,label,value,note,color}:any){return <article className="stat-card"><div className={'stat-icon '+color}><Icon size={19}/></div><p>{label}</p><strong>{value}</strong><small>{note}</small></article>}
export default App
