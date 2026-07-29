import { useApp } from '../app/AppContext'

export function DemoBanner() {
  const { catalogError, reloadCatalog, syncError, syncing, retrySync } = useApp()
  if (catalogError) {
    return <div className="sync-error-banner" role="alert"><span>{catalogError}</span><button onClick={() => void reloadCatalog()} disabled={syncing}>{syncing ? 'กำลังลองใหม่…' : 'โหลดหนังสือใหม่'}</button></div>
  }
  if (syncError) {
    return <div className="sync-error-banner" role="alert"><span>{syncError}</span><button onClick={retrySync} disabled={syncing}>{syncing ? 'กำลังลองใหม่…' : 'ลองอีกครั้ง'}</button></div>
  }
  return null
}
