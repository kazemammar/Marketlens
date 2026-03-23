'use client'

import StablecoinMonitor from './StablecoinMonitor'
import BtcEtfTracker     from './BtcEtfTracker'

export default function CryptoIntelPanels() {
  return (
    <div className="mb-6 space-y-4">
      <StablecoinMonitor />
      <BtcEtfTracker />
    </div>
  )
}
