import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { createMission, getMissions, login, reissue, setAccessToken } from './api'
import type { Mission } from './api'
import './App.css'

type AuthState = 'loading' | 'authenticated' | 'anonymous'

function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true); setError('')
    try {
      await login(String(form.get('email')), String(form.get('password')))
      onAuthenticated(); navigate('/missions')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인에 실패했습니다.')
    } finally { setPending(false) }
  }

  return <main className="auth-page"><form className="login-form" onSubmit={submit}>
    <p className="eyebrow">WECANDOIT ADMIN</p><h1>관리자 로그인</h1>
    <label>이메일<input required name="email" type="email" autoComplete="email" /></label>
    <label>비밀번호<input required name="password" type="password" autoComplete="current-password" /></label>
    {error && <p className="error">{error}</p>}
    <button disabled={pending}>{pending ? '로그인 중...' : '로그인'}</button>
  </form></main>
}

function MissionPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [listError, setListError] = useState('')
  const [loading, setLoading] = useState(true)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [pending, setPending] = useState(false)

  async function load() {
    setLoading(true); setListError('')
    try { setMissions(await getMissions()) } catch (cause) {
      setListError(cause instanceof Error ? cause.message : '미션 목록을 불러오지 못했습니다.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const decisionConditionText = String(form.get('decisionCondition') ?? '').trim()
    let decisionCondition: unknown = null
    try { decisionCondition = decisionConditionText ? JSON.parse(decisionConditionText) : null } catch {
      setCreateError('결정 조건은 올바른 JSON이어야 합니다.'); return
    }
    setPending(true); setCreateError(''); setCreateSuccess('')
    try {
      await createMission({
        missionImageUrl: String(form.get('missionImageUrl')),
        type: String(form.get('type')),
        title: String(form.get('title') ?? '') || null,
        detail: String(form.get('detail') ?? '') || null,
        decisionCondition: decisionCondition as string | null,
      })
      event.currentTarget.reset(); setCreateSuccess('미션을 추가했습니다.')
      await load()
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : '미션 추가에 실패했습니다.')
    } finally { setPending(false) }
  }

  return <main className="admin-page"><header><div><p className="eyebrow">MISSION POOL</p><h1>미션 관리</h1></div><button className="icon-button" onClick={() => void load()} aria-label="목록 새로고침">↻</button></header>
    <div className="workspace"><section className="form-panel"><h2>새 미션</h2><form onSubmit={submit}>
      <label>이미지 URL<input required name="missionImageUrl" maxLength={100} placeholder="https://..." /></label>
      <label>타입<select required name="type" defaultValue=""><option value="" disabled>선택</option><option>OBJECT</option><option>ATTRIBUTE</option><option>RELATION</option></select></label>
      <label>제목<input name="title" maxLength={255} /></label><label>상세<textarea name="detail" maxLength={255} rows={3} /></label>
      <label>결정 조건 (JSON)<textarea name="decisionCondition" rows={6} placeholder={'{"target":"flower","constraints":{"color":"red"}}'} /></label>
      {createError && <p className="error">{createError}</p>}{createSuccess && <p className="success">{createSuccess}</p>}
      <button disabled={pending}>{pending ? '추가 중...' : '미션 추가'}</button>
    </form></section>
    <section className="list-panel"><div className="panel-title"><h2>등록된 미션</h2><span>{missions.length}개</span></div>
      {loading ? <p>목록을 불러오는 중입니다.</p> : listError ? <p className="error">{listError}</p> : missions.length === 0 ? <p>등록된 미션이 없습니다.</p> : <div className="mission-list">{missions.map((mission) => <article key={mission.missionId} className="mission-row">
        <img src={mission.missionImageUrl} alt="" /><div><div className="meta"><b>{mission.type}</b><time>{new Date(mission.createdAt).toLocaleString('ko-KR')}</time></div><h3>{mission.title || '제목 없음'}</h3><p>{mission.detail || '상세 설명 없음'}</p>{mission.decisionCondition && <code>{mission.decisionCondition}</code>}</div>
      </article>)}</div>}
    </section></div>
  </main>
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>('loading')
  useEffect(() => { reissue().then(() => setAuth('authenticated')).catch(() => { setAccessToken(null); setAuth('anonymous') }) }, [])
  if (auth === 'loading') return <main className="auth-page">세션을 확인하는 중입니다.</main>
  return <Routes><Route path="/login" element={auth === 'authenticated' ? <Navigate to="/missions" replace /> : <LoginPage onAuthenticated={() => setAuth('authenticated')} />} />
    <Route path="/missions" element={auth === 'authenticated' ? <MissionPage /> : <Navigate to="/login" replace />} /><Route path="*" element={<Navigate to="/missions" replace />} /></Routes>
}
