import {useCallback,useEffect,useState} from 'react'
import {Activity,CalendarCheck,CheckCircle2,CircleAlert,ClipboardList,Loader2} from 'lucide-react'
import {supabase} from '../lib/supabase'

type Organization={id:string;name:string;timezone:string}
type Unit={id:string;name:string;unit_type:string}
type Session={id:string;title:string;attendance_date:string;unit_id:string|null;session_status:string}
type Status={id:string;code:string;label:string;is_present:boolean;is_excused:boolean;sort_order:number}
type RecordRow={id:string;session_id:string;person_id:string;status_id:string}
type Person={id:string;full_name:string;external_code:string|null;unit_id:string|null}
export default function ReportsPage({organization}:{organization:Organization}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:organization.timezone}).format(new Date())
 const [from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today),[unitId,setUnitId]=useState('all')
 const [units,setUnits]=useState<Unit[]>([]),[sessions,setSessions]=useState<Session[]>([]),[records,setRecords]=useState<RecordRow[]>([]),[people,setPeople]=useState<Person[]>([]),[statuses,setStatuses]=useState<Status[]>([])
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const load=useCallback(async()=>{
  if(!supabase)return
  setBusy(true);setError('')
  const [u,s,st,p]=await Promise.all([
   supabase.from('organization_units').select('id,name,unit_type').eq('organization_id',organization.id).order('name'),
   supabase.from('attendance_sessions').select('id,title,attendance_date,unit_id,session_status').eq('organization_id',organization.id).gte('attendance_date',from).lte('attendance_date',to).order('attendance_date',{ascending:false}),
   supabase.from('attendance_statuses').select('id,code,label,is_present,is_excused,sort_order').eq('organization_id',organization.id).eq('is_active',true).order('sort_order'),
   supabase.from('people').select('id,full_name,external_code,unit_id').eq('organization_id',organization.id)
  ])
  const failed=[u.error,s.error,st.error,p.error].find(Boolean)
  if(failed){setError(failed.message);setBusy(false);return}
  const selected=(s.data??[]).filter(x=>unitId==='all'||x.unit_id===unitId)
  const ids=selected.map(x=>x.id);let rec:RecordRow[]=[]
  if(ids.length){const r=await supabase.from('attendance_records').select('id,session_id,person_id,status_id').eq('organization_id',organization.id).in('session_id',ids);if(r.error){setError(r.error.message);setBusy(false);return}rec=(r.data??[]) as RecordRow[]}
  setUnits((u.data??[]) as Unit[]);setSessions(selected as Session[]);setStatuses((st.data??[]) as Status[]);setPeople((p.data??[]) as Person[]);setRecords(rec);setBusy(false)
 },[organization.id,from,to,unitId])
 useEffect(()=>{void load()},[load])
 const statusMap=new Map(statuses.map(x=>[x.id,x])),personMap=new Map(people.map(x=>[x.id,x]))
 const countByCode=records.reduce((a,r)=>{const c=statusMap.get(r.status_id)?.code??'unknown';a[c]=(a[c]??0)+1;return a},{} as Record<string,number>)
 const present=records.filter(r=>statusMap.get(r.status_id)?.is_present).length
 const excused=records.filter(r=>statusMap.get(r.status_id)?.is_excused).length
 const other=records.length-present-excused,rate=records.length?Math.round(present/records.length*100):0
 const members=people.map(p=>{const own=records.filter(r=>r.person_id===p.id),hadir=own.filter(r=>statusMap.get(r.status_id)?.is_present).length,izin=own.filter(r=>statusMap.get(r.status_id)?.is_excused).length;return {...p,total:own.length,hadir,izin,other:own.length-hadir-izin,rate:own.length?Math.round(hadir/own.length*100):0}}).filter(p=>p.total).sort((a,b)=>a.full_name.localeCompare(b.full_name))
 function exportCsv(){
  const rows=[['Tanggal','Sesi','Anggota','Kode','Unit','Status'],...records.map(r=>{const s=sessions.find(x=>x.id===r.session_id),p=personMap.get(r.person_id);return [s?.attendance_date??'',s?.title??'',p?.full_name??'',p?.external_code??'',units.find(x=>x.id===p?.unit_id)?.name??'',statusMap.get(r.status_id)?.label??'']})]
  const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download='hadirku-laporan-'+from+'-'+to+'.csv';a.click();URL.revokeObjectURL(url)
 }
 const Stat=({icon:Icon,label,value,note,color}:{icon:any;label:string;value:string;note:string;color:string})=><article className="stat-card"><div className={'stat-icon '+color}><Icon size={19}/></div><p>{label}</p><strong>{value}</strong><small>{note}</small></article>
 return <><section className="welcome-row"><div><p className="eyebrow">ANALISIS KEHADIRAN</p><h1>Laporan Presensi</h1><p className="muted">Rekap kehadiran berdasarkan periode dan unit organisasi.</p></div><button className="primary-btn" onClick={exportCsv} disabled={!records.length}><ClipboardList size={16}/> Ekspor CSV</button></section>
 <section className="panel report-filters"><label>Dari tanggal<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>Sampai tanggal<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label><label>Unit / kelas<select value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="all">Semua unit</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><button className="secondary-btn" onClick={()=>void load()} disabled={busy}>{busy?<Loader2 className="spin" size={15}/>:<Activity size={15}/>} Perbarui</button></section>
 {error&&<div className="form-error">{error}</div>}
 <section className="stats-grid report-stats"><Stat icon={CalendarCheck} label="Sesi presensi" value={String(sessions.length)} note="Dalam periode terpilih" color="teal"/><Stat icon={CheckCircle2} label="Hadir" value={String(present)} note="Status yang dihitung hadir" color="blue"/><Stat icon={CircleAlert} label="Izin / dispensasi" value={String(excused)} note="Status yang dikecualikan" color="amber"/><Stat icon={Activity} label="Tingkat kehadiran" value={records.length?rate+'%':'—'} note={records.length?present+' dari '+records.length+' catatan':'Belum ada catatan'} color="violet"/></section>
 <section className="panel report-panel"><div className="panel-heading"><div><h2>Ringkasan status</h2><p>{records.length} catatan presensi · {other} status tidak hadir tanpa dispensasi</p></div></div>{busy?<div className="empty-state"><Loader2 className="spin"/> Menghitung laporan...</div>:!records.length?<div className="empty-state"><ClipboardList size={24}/><b>Belum ada data pada periode ini</b><span>Ubah periode atau buat sesi presensi terlebih dahulu.</span></div>:<div className="report-status-grid">{statuses.map(s=><div className="report-status" key={s.id}><small>{s.label}</small><b>{countByCode[s.code]??0}</b><span>{Math.round((countByCode[s.code]??0)/records.length*100)}% dari catatan</span></div>)}</div>}</section>
 <section className="panel report-panel"><div className="panel-heading"><div><h2>Rekap per anggota</h2><p>Anggota yang memiliki catatan pada periode ini.</p></div></div>{members.length?<div className="table-wrap"><table className="members-table"><thead><tr><th>Nama anggota</th><th>Total catatan</th><th>Hadir</th><th>Izin</th><th>Alpa / lainnya</th><th>Kehadiran</th></tr></thead><tbody>{members.map(p=><tr key={p.id}><td><b>{p.full_name}</b><small>{p.external_code||'Tanpa kode'}</small></td><td>{p.total}</td><td>{p.hadir}</td><td>{p.izin}</td><td>{p.other}</td><td><b>{p.rate}%</b></td></tr>)}</tbody></table></div>:<div className="empty-state">Belum ada rekap anggota.</div>}</section>
 <section className="panel report-panel"><div className="panel-heading"><div><h2>Daftar sesi</h2><p>Riwayat sesi dalam periode terpilih.</p></div></div>{sessions.length?sessions.map(s=><div className="unit-row" key={s.id}><div className="unit-icon"><CalendarCheck size={17}/></div><div className="unit-details"><b>{s.title}</b><small>{s.attendance_date} · {units.find(u=>u.id===s.unit_id)?.name??'Seluruh anggota'}</small></div><span className={s.session_status==='open'?'member-status active':'member-status inactive'}>{s.session_status==='open'?'Terbuka':'Ditutup'}</span><b>{records.filter(r=>r.session_id===s.id).length} catatan</b></div>):<div className="empty-state">Tidak ada sesi pada periode ini.</div>}</section></>
}
