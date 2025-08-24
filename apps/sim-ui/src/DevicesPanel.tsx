
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { I2CBus, SSD1306 } from 'devices'

export function OLEDPanel() {
  const bus = useMemo(()=> new I2CBus(), [])
  const oled = useMemo(()=> new SSD1306(), [])
  const canvasRef = useRef<HTMLCanvasElement|null>(null)

  useEffect(()=>{ bus.register(0x3C, oled) }, [bus, oled])

  // Render buffer to canvas
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')!
    const W = oled.width, H = oled.height
    const scale = 3
    cvs.width = W * scale
    cvs.height = H * scale
    ctx.fillStyle = '#111'
    ctx.fillRect(0,0,cvs.width,cvs.height)
    // draw pixels
    for (let page=0; page<8; page++) {
      for (let x=0; x<W; x++) {
        const byte = oled.buffer[page*W + x]
        for (let bit=0; bit<8; bit++) {
          const y = page*8 + bit
          const on = (byte >> bit) & 1
          if (on) {
            ctx.fillStyle = '#e7edf5'
            ctx.fillRect(x*scale, y*scale, scale, scale)
          }
        }
      }
    }
    // overlay
    ctx.fillStyle = 'rgba(76, 201, 240, .8)'
    ctx.font = '12px ui-sans-serif'
    ctx.fillText('SSD1306 (awaiting MCU writes)', 6, cvs.height - 8)
  })

  return (
    <div>
      <h3>OLED (SSD1306 @ 0x3C)</h3>
      <small>Renders the 128×64 framebuffer. MCU wire-up next.</small>
      <div style={{marginTop:8, border:'1px solid #2b3541', borderRadius:12, padding:12, background:'#0f141a'}}>
        <canvas ref={canvasRef}/>
      </div>
    </div>
  )
}
