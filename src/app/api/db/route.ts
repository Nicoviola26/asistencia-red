import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Se sanea el valor: un espacio o una barra final en la variable rompen la URL
// y producen un error de parseo dificil de diagnosticar.
const SUPABASE_URL = (
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
).trim().replace(/\/+$/, '');
const SUPABASE_KEY = (
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
).trim();

// El arranque en frio de un proyecto pausado de Supabase tarda 10-30s. Un
// presupuesto corto devolvia error justo en el caso que se quiere cubrir, asi
// que se deja margen para que el primer usuario tras una semana en frio
// espere y su registro se guarde.
const REQUEST_TIMEOUT_MS = Number(process.env.DB_TIMEOUT_MS || 15_000);
const MAX_ATTEMPTS = Number(process.env.DB_MAX_ATTEMPTS || 3);
// Limite de ejecucion sincrona de Netlify: 60s. El presupuesto se mantiene
// holgadamente por debajo para poder devolver cache en vez de un 502.
const TOTAL_BUDGET_MS = Number(process.env.DB_TOTAL_BUDGET_MS || 25_000);
const CACHE_TTL_MS = Number(process.env.DB_CACHE_TTL_MS || 30_000);

const SINGLE_ACCEPT = 'application/vnd.pgrst.object+json';
const ARRAY_ACCEPT = 'application/json';

type CacheEntry = { at: number; payload: unknown; count: number | null };
const cache = new Map<string, CacheEntry>();

// Cualquier escritura invalida las lecturas de esa tabla: sin esto un alta o un
// borrado no se reflejaria hasta que expire el TTL y se podrian duplicar
// registros de asistencia.
function invalidateTable(table: string) {
    const marker = `:${table}:`;
    for (const key of cache.keys()) {
        if (key.includes(marker)) cache.delete(key);
    }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Attempt = { ok: boolean; status: number; payload: any; retryAfterMs: number; count: number | null };

function parseCount(contentRange: string | null): number | null {
    if (!contentRange) return null;
    const m = contentRange.match(/\/(\d+)\*?$/);
    return m ? Number(m[1]) : null;
}

async function attemptRequest(url: string, init: RequestInit, timeoutMs: number): Promise<Attempt> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        const text = init.method === 'HEAD' ? '' : await res.text();
        let payload: any = null;
        try {
            payload = text ? JSON.parse(text) : null;
        } catch {
            payload = { message: text };
        }
        return {
            ok: res.ok,
            status: res.status,
            payload,
            count: parseCount(res.headers.get('content-range')),
            retryAfterMs: Number(res.headers.get('retry-after') || 0) * 1000,
        };
    } finally {
        clearTimeout(timer);
    }
}

export async function POST(request: Request) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return NextResponse.json(
            { error: { message: 'Supabase no configurado en el servidor' } },
            { status: 500 }
        );
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { message: 'Cuerpo de la peticion invalido' } },
            { status: 400 }
        );
    }

    const { table, method = 'GET', query: rawQuery = '', payload = null, single = false, head = false, prefer } = body;

    if (typeof table !== 'string' || !/^[a-z_][a-z0-9_]*$/i.test(table)) {
        return NextResponse.json(
            { error: { message: 'Nombre de tabla invalido' } },
            { status: 400 }
        );
    }

    // PostgREST descarta silenciosamente un select con saltos de linea y
    // devuelve todas las columnas. Se normaliza antes de construir la URL.
    const query = String(rawQuery).replace(/\s+/g, ' ').trim();

    const isRead = method === 'GET';
    const cacheKey = `${method}:${head ? 'head' : single ? 'one' : 'many'}:${table}:${query}`;
    const now = Date.now();

    if (isRead) {
        const hit = cache.get(cacheKey);
        if (hit && now - hit.at < CACHE_TTL_MS) {
            return NextResponse.json({ data: hit.payload, count: hit.count, cached: true });
        }
    }

    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;

    const headers: Record<string, string> = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: single ? SINGLE_ACCEPT : ARRAY_ACCEPT,
    };
    if (payload !== null && payload !== undefined) headers['Content-Type'] = 'application/json';
    headers.Prefer = prefer ? `${prefer},count=exact` : 'count=exact';

    const init: RequestInit = {
        method: head ? 'HEAD' : method,
        headers,
        ...(payload !== null && payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    };

    let last: Attempt | null = null;
    const deadline = Date.now() + TOTAL_BUDGET_MS;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            last = {
                ok: false,
                status: 504,
                count: null,
                payload: { message: 'Se agoto el tiempo de espera para responder' },
                retryAfterMs: 0,
            };
            break;
        }

        try {
            last = await attemptRequest(url, init, Math.min(REQUEST_TIMEOUT_MS, remaining));
        } catch (err: any) {
            const aborted = err?.name === 'AbortError';
            last = {
                ok: false,
                status: aborted ? 408 : 0,
                count: null,
                payload: {
                    message: aborted
                        ? `Timeout de ${REQUEST_TIMEOUT_MS}ms esperando a Supabase`
                        : `No se pudo conectar con Supabase: ${err?.message || err}`,
                },
                retryAfterMs: 0,
            };
        }

        if (last.ok) break;

        const status = last.status;
        const isTransient =
            status === 0 ||
            status === 408 ||
            status === 425 ||
            status === 429 ||
            status === 504 ||
            (status >= 500 && status <= 599);

        if (!isTransient || i === MAX_ATTEMPTS - 1) break;

        const backoff = Math.min(300 * 2 ** i, 2_000);
        const wait = last.retryAfterMs > 0 ? Math.min(last.retryAfterMs, 2_000) : backoff;
        if (Date.now() + wait >= deadline) break;
        await sleep(wait);
    }

    const result = last!;

    if (result.ok) {
        if (isRead) {
            cache.set(cacheKey, { at: Date.now(), payload: result.payload, count: result.count });
        } else {
            invalidateTable(table);
        }
        return NextResponse.json({ data: result.payload, count: result.count });
    }

    if (isRead) {
        const stale = cache.get(cacheKey);
        if (stale) {
            return NextResponse.json(
                { data: stale.payload, count: stale.count, stale: true, error: result.payload },
                { status: 200 }
            );
        }
    }

    return NextResponse.json({ error: result.payload }, { status: result.status || 502 });
}
