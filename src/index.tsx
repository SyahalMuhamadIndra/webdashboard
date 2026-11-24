import { Hono } from 'hono'
import { cors } from 'hono/cors'
// HTML halaman asli ("Pusat Laporan Outlet — Simaung Corporation") di-import sebagai string.
import dashboardHtml from './dashboard.html?raw'

const app = new Hono()

app.use('/api/*', cors())
app.use('/api/*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
})

app.get('/api/health', (c) =>
  c.json({ ok: true, app: 'Pusat Laporan Outlet', updatedAt: new Date().toISOString() })
)

app.get('/', (c) => {
  c.header('Cache-Control', 'no-cache')
  return c.html(dashboardHtml)
})

export default app
