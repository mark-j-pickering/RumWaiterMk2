import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SimEngine, defaultParams } from './engine-shim'
import { OLEDPanel as DevicesPanel } from './DevicesPanel'

type PlotPoint = { t: number; vel: number; cur: number; acc?: number }
const PLOT_MS = 10000 // 10s window

function usePlotBuffer() {
  const buf = useRef<PlotPoint[]>([])
  const push = (pt: PlotPoint) => {
    buf.current.push(pt)
    const cutoff = pt.t - PLOT_MS
    while (buf.current.length && buf.current[0].t < cutoff) buf.current.shift()
  }
  return { buf, push }
}

const VERSION = "1.3.7"

export default function App() {
  const dpAny = defaultParams as any

  const [running, setRunning] = useState(true)
  const [mass, setMass] = useState<number>(defaultParams.massKg)
  const [speed, setSpeed] = useState<number>(defaultParams.targetSpeedMS)
  const [hardTripA, setHardTripA] = useState<number>(defaultParams.hardTripA)
  const softTripA = Math.round(hardTripA*0.8*10)/10
  const [jamActive, setJamActive] = useState(false)
  const [doorOpen, setDoorOpen] = useState(false)
  
  // Limit switch parameters (fallbacks in case engine doesn't define them)
  const [limitTopM, setLimitTopM] = useState<number>(dpAny.limitTopM ?? 1.995)
  const [limitBottomM, setLimitBottomM] = useState<number>(dpAny.limitBottomM ?? 0.005)
  const [limitHystM, setLimitHystM] = useState<number>(dpAny.limitHystM ?? 0.002)

  const engineRef = useRef<SimEngine | null>(null)
  const [state, setState] = useState(() => ({
    t: 0, pos: 0, vel: 0, accel: 0, currentA: 0, duty: 0,
    dir: 0 as -1 | 0 | 1,
    trip: 'none' as 'none' | 'soft' | 'hard' | 'door' | 'limit' | 'RUNNING' | 'PAUSED' | 'JAM',
    limitTop: false, limitBottom: false
  }))

  const { buf, push } = usePlotBuffer()
  const plotRef = useRef<HTMLCanvasElement | null>(null)
  const shaftRef = useRef<HTMLCanvasElement | null>(null)

  const [runMs, setRunMs] = useState(0)
  const [forceLimTop, setForceLimTop] = useState(false)
  const [forceLimBottom, setForceLimBottom] = useState(false)
  const [lap, setLap] = useState<{active:boolean; startPos:number; moved:boolean}>({
    active: false, startPos: 0, moved: false
  })

  const makeParams = () => {
    const p: any = {
      ...defaultParams,
      massKg: mass,
      targetSpeedMS: speed,
      softTripA,
      hardTripA,
    }
    if (dpAny.limitTopM !== undefined) {
      p.limitTopM = limitTopM
      p.limitBottomM = limitBottomM
      p.limitHystM = limitHystM
    }
    return p
  }

  // Init / re-init engine when main params change
  useEffect(() => {
    engineRef.current = new (SimEngine as any)(makeParams())
    engineRef.current?.setDoorOpen(doorOpen)
    setState(s => ({...s, t:0, pos:0, vel:0, accel:0, currentA:0, duty:0, dir:0, trip:'none'}))
    setRunMs(0); setLap({active:false, startPos:0, moved:false})
    buf.current = []
  }, [mass, speed, softTripA, hardTripA, limitTopM, limitBottomM, limitHystM])

  // Keep engine in sync with door/overload toggles
  useEffect(() => { engineRef.current?.setDoorOpen(doorOpen) }, [doorOpen])
  

  // Simulation loop
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      let dt = now - last
      if (dt > 50) dt = 50
      last = now

      const eng = engineRef.current!
      if (running) {
        let acc = dt
        while (acc >= 1) { eng.tick(1); acc -= 1 }
      }
      const st = {
        t: eng.state.t,
        pos: (eng.state as any).posM ?? 0,
        vel: (eng.state as any).velMS ?? 0,
        accel: (eng.state as any).accelMS2 ?? 0,
        currentA: (eng.state as any).currentA ?? 0,
        duty: (eng.state as any).duty ?? 0,
        dir: (eng.state as any).dir ?? 0,
        trip: (eng.state as any).trip ?? 'none',
        limitTop: (eng.state as any)?.limitTop ?? false,
        limitBottom: (eng.state as any)?.limitBottom ?? false,
      }
      setState(st)
      push({ t: st.t, vel: st.vel, cur: st.currentA, acc: st.accel })

      // Run clock logic
      const eps = 0.005
      const atBottom = st.pos <= eps
      const atTop = st.pos >= 2.0 - eps
      const atRest = Math.abs(st.vel) < 1e-6

      if (lap.active && !lap.moved && Math.abs(st.pos - lap.startPos) > eps) {
        setLap(prev => ({...prev, moved: true}))
      }
      if (lap.active && lap.moved && running && Math.abs(st.vel) > 1e-5 && st.dir !== 0 && st.trip !== 'door') {
        setRunMs(ms => ms + dt)
      }
      if (lap.active && lap.moved && (((st.trip === 'limit') && ((lap.startPos <= eps && st.dir > 0) || (lap.startPos >= 2.0 - eps && st.dir < 0))) || (atRest && ((lap.startPos <= eps && atTop) || (lap.startPos >= 2.0 - eps && atBottom))))) {
        setLap({active:false, startPos: st.pos, moved:false})
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, lap, buf, push])

  // Strip chart (vel + current)
  useEffect(() => {
    const cvs = plotRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')!
    const W = cvs.width, H = cvs.height
    ctx.clearRect(0,0,W,H)
    ctx.strokeStyle = '#22303c'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5,0.5,W-1,H-1)

    const data = buf.current
    if (data.length < 2) return

    const t0 = data[0].t, t1 = data[data.length-1].t
    const tspan = Math.max(1, t1 - t0)
    const x = (t: number) => ((t - t0) / tspan) * (W - 20) + 10

    const velMax = 0.4
    const curMax = Math.max(30, hardTripA)
    const yVel = (v:number)=> H - (((v + velMax) / (2*velMax)) * (H-20) + 10)
    const yCur = (v:number)=> H - ((v / curMax) * (H-20) + 10)
    const accMax = 1.5
    const yAcc = (v:number)=> H - (((v + accMax) / (2*accMax)) * (H-20) + 10)

    ctx.beginPath()
    data.forEach((d,i)=> { const xi = x(d.t); const yi = yVel(d.vel); if(i===0) ctx.moveTo(xi,yi); else ctx.lineTo(xi,yi) })
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.stroke()

    ctx.beginPath()
    data.forEach((d,i)=> { const xi = x(d.t); const yi = yCur(d.cur); if(i===0) ctx.moveTo(xi,yi); else ctx.lineTo(xi,yi) })
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke()

    ctx.beginPath()
    buf.current.forEach((d,i)=>{ const xi=x(d.t); const yi=yAcc((d as any).acc ?? 0); if(i===0) ctx.moveTo(xi,yi); else ctx.lineTo(xi,yi) })
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.stroke()
  }, [state.t, hardTripA])

  // Vertical shaft render
  useEffect(() => {
    const cvs = shaftRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')!
    const W = cvs.width, H = cvs.height
    ctx.clearRect(0,0,W,H)

    ctx.fillStyle = '#0f141a'
    ctx.strokeStyle = '#2b3541'
    ctx.lineWidth = 2
    const margin = 16
    const shaftX = (W/2) - 60
    const shaftW = 120
    const shaftY = margin
    const shaftH = H - margin*2
    ctx.fillRect(shaftX, shaftY, shaftW, shaftH)
    ctx.strokeRect(shaftX, shaftY, shaftW, shaftH)

    // Door indicator caps
    ctx.fillStyle = doorOpen ? 'rgba(239,68,68,.25)' : 'rgba(34,197,94,.2)'
    ctx.fillRect(shaftX, shaftY, shaftW, 14)
    ctx.fillRect(shaftX, shaftY + shaftH - 14, shaftW, 14)

    // Carriage
    const travel = 2.0
    const pos = Math.max(0, Math.min(travel, state.pos))
    const y = shaftY + shaftH - (pos/travel)*shaftH
    const carH = 28, carW = shaftW - 20
    const carX = shaftX + 10, carY = y - carH/2
    ctx.fillStyle = '#1f2937'
    ctx.strokeStyle = '#4cc9f0'
    ctx.lineWidth = 2
    ctx.fillRect(carX, carY, carW, carH)
    ctx.strokeRect(carX, carY, carW, carH)

    // Limit flags
    if (state.limitTop) { ctx.fillStyle = 'rgba(239,68,68,.2)'; ctx.fillRect(shaftX, shaftY, shaftW, 8) }
    if (state.limitBottom) { ctx.fillStyle = 'rgba(239,68,68,.2)'; ctx.fillRect(shaftX, shaftY + shaftH - 8, shaftW, 8) }
    // LEDs
    const ledR = 6
    ctx.beginPath(); ctx.arc(shaftX + shaftW + 12, shaftY + 10, ledR, 0, Math.PI*2); ctx.fillStyle = (state.limitTop || forceLimTop)? '#ef4444':'#374151'; ctx.fill()
    ctx.beginPath(); ctx.arc(shaftX + shaftW + 12, shaftY + shaftH - 10, ledR, 0, Math.PI*2); ctx.fillStyle = (state.limitBottom || forceLimBottom)? '#ef4444':'#374151'; ctx.fill()

    // Labels
    ctx.fillStyle = '#9aa7b1'
    ctx.font = '12px ui-sans-serif'
    ctx.fillText(`pos ${(pos).toFixed(3)} m`, carX+6, carY-6)
  }, [state.pos, doorOpen, state.limitTop, state.limitBottom])

  const onCmd = (c: 'up'|'down'|'stop'|'jam') => {
    if (c === 'up' || c === 'down') {
      setState(s => ({...s, trip:'none'}))
      setForceLimTop(false)
      setForceLimBottom(false)
      setRunMs(0)
      setLap({active:true, startPos: state.pos, moved:false})
    }
    if ((c === 'up' && (state.limitTop || forceLimTop)) ||
        (c === 'down' && (state.limitBottom || forceLimBottom))) {
      engineRef.current?.command('stop')
      return
    }
    if (c === 'jam') {
      const newVal = !jamActive
      setJamActive(newVal)
      if (newVal) { engineRef.current?.command('stop') }
      return
    }
    if (c === 'up' || c === 'down') {
      setState(s => ({...s, trip:'none'}))
      setRunMs(0); setLap({active:true, startPos: state.pos, moved:false})
    }
    engineRef.current?.command(c)
  }

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') onCmd('up')
      if (e.key === 'ArrowDown') onCmd('down')
      if (e.key.toLowerCase() === 'p') setRunning(v=>!v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.pos])

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v2H4zM7 11h10v2H7zM9 15h6v2H9z" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round"/></svg>
          <div>
            <h1>RUMWaiter Mk2</h1>
            <small>↑/↓ move, space stop, P pause</small>
          </div>
        </div>
        <span className="badge">SWL 50 kg • travel 2.0 m • drum 50 mm</span>
      </header>

      
      <div className="topgrid">
        <section className="card controls">
          <h3>Controls</h3>
          <div className="row" style={{marginTop:8}}>
            <div className="input"><span>Mass (kg)</span><input type="number" min={1} max={200} value={mass} onChange={e=>setMass(+e.target.value)} /></div>
            <div className="input"><span>Target speed (m/s)</span><input type="number" step="0.05" value={speed} onChange={e=>setSpeed(+e.target.value)} /></div>
            <div className="input"><span>Soft trip (80% of hard)</span><input type="number" step="0.1" value={Math.round(hardTripA*0.8*10)/10} readOnly /></div>
            <div className="input"><span>Hard trip (A)</span><input type="number" step="0.5" value={hardTripA} onChange={e=>setHardTripA(+e.target.value)} /></div>
          </div>

          <div className="btns">
            <button className="btn primary" onClick={()=>onCmd('up')}>Up</button>
            <button className="btn primary" onClick={()=>onCmd('down')}>Down</button>
            <button className="btn" onClick={()=>setRunning(v=>!v)}>{running? 'Pause' : 'Run'}</button>
            <button className="btn ghost" onClick={()=>{
              engineRef.current = new (SimEngine as any)(makeParams())
              engineRef.current?.setDoorOpen(doorOpen)
              setState(s=>({...s, t:0, pos:0, vel:0, accel:0, currentA:0, duty:0, dir:0, trip:'none'}))
              setRunMs(0); setLap({active:false, startPos:0, moved:false});
              buf.current = [];
              requestAnimationFrame(()=>{ const c = plotRef.current; if(c){ const ctx = c.getContext('2d')!; ctx.clearRect(0,0,c.width,c.height);} })
            }}>Reset</button>
          </div>
          <div className="kb" style={{marginTop:6}}>Interlocks and faults below.</div>
        </section>

        <section className="card">
          <h3>Position</h3>
          <div style={{border:'1px solid #2b3541', borderRadius:12, background:'#0f141a', display:'flex', alignItems:'center', justifyContent:'center', padding:12, height:'calc(100% - 40px)'}}>
            <canvas ref={shaftRef} width={280} height={360} />
          </div>
        </section>

        <section className="card">
          <h3>Live signals</h3>
          <div className="status" style={{marginTop:8}}>
            <div className="stat">
              <h4>Run time</h4>
              <div className="big">{(runMs/1000).toFixed(2)} s</div>
            </div>
            <div className="stat">
              <h4>Velocity</h4>
              <div className="big">{state.vel.toFixed(3)} m/s</div>
            </div>
            <div className="stat">
              <h4>Acceleration</h4>
              <div className="big">{state.accel.toFixed(2)} m/s²</div>
            </div>
            <div className="stat">
              <h4>Current</h4>
              <div className="big">{state.currentA.toFixed(1)} A</div>
              <div className="bar"><div style={{width:`${Math.min(100, state.currentA/Math.max(30, hardTripA)*100)}%`, background: state.currentA>=hardTripA? '#ef4444' : state.currentA>=softTripA? '#f59e0b' : '#22c55e'}}/></div>
            </div>
            <div className="stat">
              <h4>Duty</h4>
              <div className="big">{(state.duty*100).toFixed(0)} %</div>
            </div>
            <div className="stat">
              <h4>State</h4>
              {(() => {
                let color = 'text-gray-400'
                if (state.trip === 'RUNNING') color = 'text-green-400'
                else if (state.trip === 'PAUSED') color = 'text-yellow-400'
                else if (state.trip === 'JAM') color = 'text-red-500'

                const arrow = state.dir > 0 ? '↑' : state.dir < 0 ? '↓' : ''

                return (
                  <div className={`big font-bold ${color}`}>
                    {String(state.trip).toUpperCase()} {arrow}
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="canvas" style={{marginTop:12}}>
            <div className="legend">
              <span><i className="dot vel"></i>vel (m/s)</span>
              <span><i className="dot cur"></i>current (A)</span>
            </div>
            <canvas ref={plotRef} width={800} height={220} />
          </div>
        </section>
      </div>

      <div className="bottomgrid">
        <section className="card">
          <h3>OLED</h3>
          <DevicesPanel />
        </section>

        <section className="card">
          <h3>Interlocks</h3>
          <div className="row" style={{marginTop:8}}>
            <div style={{display:'flex', gap:8}}>
              <span className="badge">Limit switches:</span>
              <span className="badge" style={{color: state.limitTop? '#ef4444': undefined}}>Top: {state.limitTop? 'ON':'OFF'}</span>
              <span className="badge" style={{color: state.limitBottom? '#ef4444': undefined}}>Bottom: {state.limitBottom? 'ON':'OFF'}</span>
            </div>
            <div className="input">
              <span>Door open</span>
              <input type="checkbox" checked={doorOpen} onChange={e=>setDoorOpen(e.target.checked)} />
            </div>
            <div className="btns">
              <button className={`btn ${jamActive ? "btn-red" : ""}`} onClick={() => onCmd('jam')}>
                JAM
              </button>
            </div>
            <div className="input"><span>Top switch (m)</span><input type="number" step="0.001" value={limitTopM} onChange={e=>setLimitTopM(+e.target.value)} /></div>
            <div className="input"><span>Bottom switch (m)</span><input type="number" step="0.001" value={limitBottomM} onChange={e=>setLimitBottomM(+e.target.value)} /></div>
            <div className="input"><span>Hysteresis (m)</span><input type="number" step="0.001" value={limitHystM} onChange={e=>setLimitHystM(+e.target.value)} /></div>
            <div className="input"><span>Force top limit</span><input type="checkbox" onChange={e=>{ setForceLimTop(e.target.checked); engineRef.current?.setLimitOverride({top: e.target.checked}) }} /></div>
            <div className="input"><span>Force bottom limit</span><input type="checkbox" onChange={e=>{ setForceLimBottom(e.target.checked); engineRef.current?.setLimitOverride({bottom: e.target.checked}) }} /></div>
            <small className="kb">Door interlock forces stop (DOOR). Limit switches hold motion (LIMIT).</small>
          </div>
        </section>
      </div>

      <footer className="footer">
        <div>UI rev 4 • limit switches • hold-at-limits • accel + run clock</div>
        <div>© RUMWaiter Mk2 v1.3.7</div>
      </footer>
    </div>
  )
}
