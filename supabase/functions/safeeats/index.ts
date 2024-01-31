import { Application, Router } from 'https://deno.land/x/oak@v13.0.0/mod.ts'
import { createClient } from '@supabase/supabase-js'
import * as Preferences from './preferences.ts'
import * as Analyzer from './analyzer.ts'
import * as Inventory from './inventory.ts'

const app = new Application()

app.use((ctx, next) => {
    ctx.state.supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
            auth: { persistSession: false },
            global: { headers: { Authorization: ctx.request.headers.get('Authorization')! } }
        }
    )
    ctx.state.activityId = crypto.randomUUID()
    return next()
})

const router = new Router()

router
    .post('/safeeats/preferences', async (ctx) => {
        await Preferences.set(ctx)
    })
    .get('/safeeats/preferences', async (ctx) => {
        await Preferences.get(ctx)
    })
    .get('/inventory/:barcode', async (ctx) => {
        await Inventory.get(ctx, ctx.params.barcode)
    })
    .post('/safeeats/analyze/:barcode', async (ctx) => {
        await Analyzer.analyze(ctx, ctx.params.barcode)
    })

app.use(router.routes())
app.use(router.allowedMethods())

await app.listen({ port: 8000 })