import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  createItem,
  createMission,
  getCharacterAssets,
  getItems,
  getMissions,
  getEnvironment,
  loginWithEnvironmentFallback,
  logoutCurrentEnvironment,
  reissue,
  resolveImageUrl,
  stopItemSale,
  updateCharacterAsset,
  updateItem,
} from './api'
import type { AdminItem, CharacterAsset, Mission } from './api'
import { environments } from './environment'
import type { Environment } from './environment'
import './App.css'

type AuthState = 'loading' | 'authenticated' | 'anonymous'

function EnvironmentSelector({ environment, onChange, disabled }: {
  environment: Environment
  onChange: (environment: Environment) => void
  disabled: boolean
}) {
  return <div className="environment-selector"><label htmlFor="environment">API 환경</label>
    <select id="environment" value={environment} disabled={disabled} onChange={(event) => onChange(event.target.value as Environment)}>
      {Object.entries(environments).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
    </select>
  </div>
}

function LoginPage({ onAuthenticated }: { onAuthenticated: (environment: Environment) => void }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      const environment = await loginWithEnvironmentFallback(String(form.get('email')), String(form.get('password')))
      onAuthenticated(environment)
      navigate('/missions')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인에 실패했습니다.')
    } finally {
      setPending(false)
    }
  }

  return <main className="auth-page"><form className="login-form" onSubmit={submit}>
    <p className="eyebrow">WECANDOIT ADMIN</p><h1>관리자 로그인</h1>
    <label>이메일<input required name="email" type="email" autoComplete="email" /></label>
    <label>비밀번호<input required name="password" type="password" autoComplete="current-password" /></label>
    {error && <p className="error">{error}</p>}
    <button disabled={pending}>{pending ? '로그인 중...' : '로그인'}</button>
  </form></main>
}

function MissionPage({ environment, onLogout }: { environment: Environment; onLogout: () => void }) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [listError, setListError] = useState('')
  const [loading, setLoading] = useState(true)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [pending, setPending] = useState(false)

  async function load() {
    setLoading(true)
    setListError('')
    try { setMissions(await getMissions()) } catch (cause) {
      setListError(cause instanceof Error ? cause.message : '미션 목록을 불러오지 못했습니다.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [environment])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const decisionConditionText = String(form.get('decisionCondition') ?? '').trim()
    let decisionCondition: unknown = null
    try { decisionCondition = decisionConditionText ? JSON.parse(decisionConditionText) : null } catch {
      setCreateError('결정 조건은 올바른 JSON이어야 합니다.')
      return
    }
    setPending(true)
    setCreateError('')
    setCreateSuccess('')
    try {
      await createMission({ missionImageUrl: String(form.get('missionImageUrl')), type: String(form.get('type')), title: String(form.get('title') ?? '') || null, detail: String(form.get('detail') ?? '') || null, decisionCondition: decisionCondition as string | null })
      event.currentTarget.reset()
      setCreateSuccess('미션을 추가했습니다.')
      await load()
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : '미션 추가에 실패했습니다.')
    } finally { setPending(false) }
  }

  return <main className="admin-page"><PageHeader environment={environment} onLogout={onLogout} title="미션 관리" onRefresh={() => void load()} />
    <div className="workspace"><section className="form-panel"><h2>새 미션</h2><form onSubmit={submit}>
      <label>이미지 URL<input required name="missionImageUrl" maxLength={100} placeholder="https://..." /></label>
      <label>타입<select required name="type" defaultValue=""><option value="" disabled>선택</option><option>OBJECT</option><option>ATTRIBUTE</option><option>RELATION</option></select></label>
      <label>제목<input name="title" maxLength={255} /></label><label>상세<textarea name="detail" maxLength={255} rows={3} /></label>
      <label>결정 조건 (JSON)<textarea name="decisionCondition" rows={6} placeholder={'{"target":"flower","constraints":{"color":"red"}}'} /></label>
      {createError && <p className="error">{createError}</p>}{createSuccess && <p className="success">{createSuccess}</p>}
      <button disabled={pending}>{pending ? '추가 중...' : '미션 추가'}</button>
    </form></section>
    <section className="list-panel"><div className="panel-title"><h2>등록된 미션</h2><span>{missions.length}개</span></div>
      {loading ? <p>목록을 불러오는 중입니다.</p> : listError ? <p className="error">{listError}</p> : missions.length === 0 ? <p>등록된 미션이 없습니다.</p> : <div className="mission-list">{missions.map((mission) => <article key={mission.missionId} className="mission-row"><img src={resolveImageUrl(mission.missionImageUrl)} alt="" /><div><div className="meta"><b>{mission.type}</b><time>{new Date(mission.createdAt).toLocaleString('ko-KR')}</time></div><h3>{mission.title || '제목 없음'}</h3><p>{mission.detail || '상세 설명 없음'}</p>{mission.decisionCondition && <code>{mission.decisionCondition}</code>}</div></article>)}</div>}
    </section></div>
  </main>
}

function PageHeader({ environment, onLogout, title, onRefresh }: { environment: Environment; onLogout: () => void; title: string; onRefresh: () => void }) {
  return <header><div><p className="eyebrow">WECANDOIT ADMIN · {environments[environment].label}</p><h1>{title}</h1><nav className="admin-nav"><NavLink to="/missions">미션</NavLink><NavLink to="/character-assets">캐릭터</NavLink><NavLink to="/items">아이템</NavLink></nav></div><div className="header-actions"><button className="icon-button" onClick={onRefresh} aria-label="목록 새로고침">↻</button><button onClick={onLogout}>로그아웃</button></div></header>
}

function CharacterAssetsPage({ environment, onLogout }: { environment: Environment; onLogout: () => void }) {
  const [assets, setAssets] = useState<CharacterAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingGender, setPendingGender] = useState<CharacterAsset['gender'] | null>(null)

  async function load() {
    setLoading(true); setError('')
    try { setAssets(await getCharacterAssets()) } catch (cause) { setError(cause instanceof Error ? cause.message : '캐릭터 이미지를 불러오지 못했습니다.') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [environment])

  async function submit(event: FormEvent<HTMLFormElement>, gender: CharacterAsset['gender']) {
    event.preventDefault()
    const image = new FormData(event.currentTarget).get('image')
    if (!(image instanceof File) || image.size === 0) { setError('이미지 파일을 선택해 주세요.'); return }
    setPendingGender(gender); setError('')
    try { await updateCharacterAsset(gender, image); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : '캐릭터 이미지 저장에 실패했습니다.') } finally { setPendingGender(null) }
  }

  return <main className="admin-page"><PageHeader environment={environment} onLogout={onLogout} title="캐릭터 관리" onRefresh={() => void load()} />
    <section className="list-panel"><div className="panel-title"><h2>기본 캐릭터 이미지</h2><span>{assets.length}개</span></div>{error && <p className="error">{error}</p>}
      {loading ? <p>목록을 불러오는 중입니다.</p> : <div className="asset-grid">{(['MALE', 'FEMALE'] as const).map((gender) => { const asset = assets.find((entry) => entry.gender === gender); return <article key={gender} className="asset-card"><img src={resolveImageUrl(asset?.imageUrl)} alt={`${gender === 'MALE' ? '남성' : '여성'} 기본 캐릭터`} /><div><h3>{gender === 'MALE' ? '남성' : '여성'} 기본 캐릭터</h3>{asset && <time>수정: {new Date(asset.updatedAt).toLocaleString('ko-KR')}</time>}<form onSubmit={(event) => void submit(event, gender)}><input name="image" type="file" accept="image/*" /><button disabled={pendingGender === gender}>{pendingGender === gender ? '저장 중...' : '이미지 교체'}</button></form></div></article> })}</div>}
    </section>
  </main>
}

function ItemsPage({ environment, onLogout }: { environment: Environment; onLogout: () => void }) {
  const [items, setItems] = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try { setItems(await getItems()) } catch (cause) { setError(cause instanceof Error ? cause.message : '아이템 목록을 불러오지 못했습니다.') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [environment])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const image = form.get('image')
    if (!(image instanceof File) || image.size === 0) { setError('아이템 이미지를 선택해 주세요.'); return }
    setPending(true); setError(''); setSuccess('')
    try { await createItem({ name: String(form.get('name')).trim(), category: String(form.get('category')), price: Number(form.get('price')) }, image); event.currentTarget.reset(); setSuccess('아이템을 추가했습니다.'); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : '아이템 추가에 실패했습니다.') } finally { setPending(false) }
  }
  async function save(item: AdminItem, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const image = form.get('image')
    setPending(true); setError(''); setSuccess('')
    try { await updateItem(item.itemId, { name: String(form.get('name')).trim(), category: String(form.get('category')), price: Number(form.get('price')), availableForSale: form.get('availableForSale') === 'on' }, image instanceof File && image.size > 0 ? image : undefined); setSuccess('아이템을 수정했습니다.'); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : '아이템 수정에 실패했습니다.') } finally { setPending(false) }
  }
  async function stop(itemId: number) {
    setPending(true); setError(''); setSuccess('')
    try { await stopItemSale(itemId); setSuccess('판매를 중지했습니다.'); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : '판매 중지에 실패했습니다.') } finally { setPending(false) }
  }

  return <main className="admin-page"><PageHeader environment={environment} onLogout={onLogout} title="아이템 관리" onRefresh={() => void load()} /><div className="workspace"><section className="form-panel"><h2>새 아이템</h2><form onSubmit={create}><label>이름<input required name="name" maxLength={100} /></label><label>카테고리<select required name="category" defaultValue="HAT"><option>HAT</option><option>TOP</option><option>BOTTOM</option><option>SHOES</option><option>SUNGLASSES</option><option>ACCESSORY</option></select></label><label>가격<input required name="price" type="number" min="0" /></label><label>이미지<input required name="image" type="file" accept="image/*" /></label><button disabled={pending}>{pending ? '저장 중...' : '아이템 추가'}</button></form></section><section className="list-panel"><div className="panel-title"><h2>등록된 아이템</h2><span>{items.length}개</span></div>{error && <p className="error">{error}</p>}{success && <p className="success">{success}</p>}{loading ? <p>목록을 불러오는 중입니다.</p> : <div className="item-list">{items.map((item) => <article className="item-row" key={item.itemId}><img src={resolveImageUrl(item.imageUrl)} alt="" /><form onSubmit={(event) => void save(item, event)}><label>이름<input required name="name" defaultValue={item.name} maxLength={100} /></label><label>카테고리<select name="category" defaultValue={item.category}><option>HAT</option><option>TOP</option><option>BOTTOM</option><option>SHOES</option><option>SUNGLASSES</option><option>ACCESSORY</option></select></label><label>가격<input required name="price" type="number" min="0" defaultValue={item.price} /></label><label>새 이미지 (선택)<input name="image" type="file" accept="image/*" /></label><label className="checkbox-label"><input name="availableForSale" type="checkbox" defaultChecked={item.availableForSale} /> 판매 중</label><div className="row-actions"><button disabled={pending}>수정</button>{item.availableForSale && <button type="button" className="danger-button" disabled={pending} onClick={() => void stop(item.itemId)}>판매 중지</button>}</div></form></article>)}</div>}</section></div></main>
}

export default function App() {
  const [environment, setSelectedEnvironment] = useState<Environment>(() => getEnvironment())
  const [auth, setAuth] = useState<AuthState>('loading')
  const [switching, setSwitching] = useState(false)
  const authOperation = useRef(0)

  useEffect(() => {
    if (auth !== 'loading') return
    let active = true
    reissue().then(() => active && setAuth('authenticated')).catch(() => active && setAuth('anonymous'))
    return () => { active = false }
  }, [auth, environment])

  async function logout() {
    const operation = authOperation.current + 1
    authOperation.current = operation
    setSwitching(true)
    await logoutCurrentEnvironment()
    if (authOperation.current === operation) {
      setAuth('anonymous')
      setSwitching(false)
    }
  }

  if (switching) {
    return <><EnvironmentSelector environment={environment} onChange={() => undefined} disabled />
      <main className="auth-page">환경을 전환하는 중입니다.</main>
    </>
  }

  return <>{auth === 'loading' ? <main className="auth-page">세션을 확인하는 중입니다.</main> : <Routes>
      <Route path="/login" element={auth === 'authenticated' ? <Navigate to="/missions" replace /> : <LoginPage onAuthenticated={(next) => { setSelectedEnvironment(next); setAuth('authenticated') }} />} />
      <Route path="/missions" element={auth === 'authenticated' ? <MissionPage environment={environment} onLogout={() => void logout()} /> : <Navigate to="/login" replace />} />
      <Route path="/character-assets" element={auth === 'authenticated' ? <CharacterAssetsPage environment={environment} onLogout={() => void logout()} /> : <Navigate to="/login" replace />} />
      <Route path="/items" element={auth === 'authenticated' ? <ItemsPage environment={environment} onLogout={() => void logout()} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/missions" replace />} />
    </Routes>}
  </>
}
