import { Application, Router } from 'https://deno.land/x/oak@v12.6.0/mod.ts'
import { createClient } from '@supabase/supabase-js'
import * as Preferences from './preferences.ts'
import * as Analyzer from './analyzer.ts'
import * as Extractor from './extractor.ts'
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
    .post('/ingredicheck/preferences', async (ctx) => {
        await Preferences.set(ctx)
    })
    .get('/ingredicheck/preferences', async (ctx) => {
        await Preferences.get(ctx)
    })
    .get('/ingredicheck/inventory/:barcode', async (ctx) => {
        await Inventory.get(ctx, ctx.params.barcode)
    })
    .post('/ingredicheck/analyze', async (ctx) => {
        await Analyzer.analyze(ctx)
    })
    .patch('/ingredicheck/analyze/rate', async (ctx) => {
        await Analyzer.rate(ctx)
    })
    .post('/ingredicheck/extract', async (ctx) => {
        await Extractor.extract(ctx)
    })

app.use(router.routes())
app.use(router.allowedMethods())

await app.listen({ port: 8000 })