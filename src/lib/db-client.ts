const PROXY_ENDPOINT = '/api/db';
// El proxy del servidor ya reintenta por su cuenta, asi que aqui basta con un
// reintento extra para fallos de red hacia la propia funcion.
const CLIENT_ATTEMPTS = 2;
// Debe superar el presupuesto del servidor (25s) para que el cliente no corte
// antes de que la funcion de Netlify haya agotado sus propios reintentos.
const CLIENT_TIMEOUT_MS = 30_000;
const STALE_KEY_PREFIX = 'dbfallback:';
const STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Result = { data: any; error: any; count?: number | null };

type SelectOptions = { count?: 'exact' | 'planned' | 'estimated'; head?: boolean };

type Order = { column: string; ascending: boolean; nullsFirst: boolean };

class QueryBuilder implements PromiseLike<Result> {
    private table: string;
    private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
    private selectColumns = '*';
    private filters: Array<[string, string]> = [];
    private orders: Order[] = [];
    private limitTo: number | null = null;
    private offsetFrom: number | null = null;
    private payload: any = null;
    private prefer: string | undefined;
    private onConflict: string | undefined;
    private wantsSingle = false;
    private wantsMaybeSingle = false;
    private wantsCount = false;
    private wantsHead = false;

    constructor(table: string) {
        this.table = table;
    }

    private params(): URLSearchParams {
        const p = new URLSearchParams();
        if (this.method === 'GET') p.set('select', this.selectColumns);
        if (this.onConflict) p.set('on_conflict', this.onConflict);
        this.filters.forEach(f => p.append(f[0], f[1]));
        this.orders.forEach(o => p.append('order', `${o.column}.${o.ascending ? 'asc' : 'desc'}${o.nullsFirst ? '.nullsfirst' : ''}`));
        if (this.limitTo !== null) p.set('limit', String(this.limitTo));
        if (this.offsetFrom !== null) p.set('offset', String(this.offsetFrom));
        return p;
    }

    select(columns = '*', options?: SelectOptions): this {
        // PostgREST ignora en silencio un select con saltos de linea y devuelve
        // todas las columnas, lo que rompe los recursos embebidos. Se normaliza.
        this.selectColumns = columns.replace(/\s+/g, ' ').trim();
        this.method = 'GET';
        if (options?.count) {
            this.wantsCount = true;
            this.prefer = `count=${options.count}`;
        }
        if (options?.head) this.wantsHead = true;
        return this;
    }

    insert(values: any): this {
        this.method = 'POST';
        this.payload = Array.isArray(values) ? values : [values];
        this.prefer = 'return=representation';
        return this;
    }

    upsert(values: any, options?: { onConflict?: string }): this {
        this.method = 'POST';
        this.payload = Array.isArray(values) ? values : [values];
        this.prefer = 'resolution=merge-duplicates,return=representation';
        if (options?.onConflict) this.onConflict = options.onConflict;
        return this;
    }

    update(values: any): this {
        this.method = 'PATCH';
        this.payload = values;
        this.prefer = 'return=representation';
        return this;
    }

    delete(): this {
        this.method = 'DELETE';
        this.prefer = 'return=representation';
        return this;
    }

    eq(column: string, value: any): this {
        this.filters.push([column, `eq.${value}`]);
        return this;
    }

    neq(column: string, value: any): this {
        this.filters.push([column, `neq.${value}`]);
        return this;
    }

    gt(column: string, value: any): this {
        this.filters.push([column, `gt.${value}`]);
        return this;
    }

    gte(column: string, value: any): this {
        this.filters.push([column, `gte.${value}`]);
        return this;
    }

    lt(column: string, value: any): this {
        this.filters.push([column, `lt.${value}`]);
        return this;
    }

    lte(column: string, value: any): this {
        this.filters.push([column, `lte.${value}`]);
        return this;
    }

    like(column: string, pattern: string): this {
        this.filters.push([column, `like.${pattern}`]);
        return this;
    }

    ilike(column: string, pattern: string): this {
        this.filters.push([column, `ilike.${pattern}`]);
        return this;
    }

    is(column: string, value: any): this {
        this.filters.push([column, value === null ? 'is.null' : `is.${value}`]);
        return this;
    }

    in(column: string, values: any[]): this {
        this.filters.push([column, `in.(${values.join(',')})`]);
        return this;
    }

    or(conditions: string): this {
        this.filters.push(['or', `(${conditions})`]);
        return this;
    }

    order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
        this.orders.push({ column, ascending: opts?.ascending !== false, nullsFirst: opts?.nullsFirst === true });
        return this;
    }

    limit(count: number): this {
        this.limitTo = count;
        return this;
    }

    range(from: number, to: number): this {
        this.offsetFrom = from;
        this.limitTo = to - from + 1;
        return this;
    }

    single(): this {
        this.wantsSingle = true;
        return this;
    }

    maybeSingle(): this {
        this.wantsMaybeSingle = true;
        return this;
    }

    private cacheKey(): string {
        return `${this.method}:${this.wantsHead ? 'head' : this.wantsSingle ? 'one' : 'many'}:${this.table}:${this.params().toString()}`;
    }

    private readFallback(key: string): any {
        if (typeof window === 'undefined') return undefined;
        try {
            const raw = window.localStorage.getItem(STALE_KEY_PREFIX + key);
            if (!raw) return undefined;
            const entry = JSON.parse(raw);
            if (Date.now() - entry.at > STALE_MAX_AGE_MS) {
                window.localStorage.removeItem(STALE_KEY_PREFIX + key);
                return undefined;
            }
            return entry.data;
        } catch {
            return undefined;
        }
    }

    private writeFallback(key: string, data: any) {
        if (typeof window === 'undefined') return;
        if (data === null || data === undefined) return;
        try {
            const payload = JSON.stringify({ at: Date.now(), data });
            if (payload.length < 4_000_000) {
                window.localStorage.setItem(STALE_KEY_PREFIX + key, payload);
            }
        } catch {
            /* cuota excedida: se ignora */
        }
    }

    // Tras escribir, la copia de respaldo de esa tabla queda desactualizada y
    // podria devolver datos viejos si la red falla.
    private clearFallbackTable() {
        if (typeof window === 'undefined') return;
        try {
            const marker = `:${this.table}:`;
            const keys: string[] = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k && k.startsWith(STALE_KEY_PREFIX) && k.includes(marker)) keys.push(k);
            }
            keys.forEach(k => window.localStorage.removeItem(k));
        } catch {
            /* se ignora */
        }
    }

    private async execute(): Promise<Result> {
        const isRead = this.method === 'GET';
        const key = this.cacheKey();
        const body = JSON.stringify({
            table: this.table,
            method: this.method,
            query: this.params().toString(),
            payload: this.payload,
            prefer: this.prefer,
            single: this.wantsSingle,
            head: this.wantsHead,
        });

        let lastError: any = null;

        for (let attempt = 0; attempt < CLIENT_ATTEMPTS; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

            try {
                const res = await fetch(PROXY_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    signal: controller.signal,
                });

                const json = await res.json();

                if (res.ok) {
                    if (isRead) this.writeFallback(key, json.data);
                    else this.clearFallbackTable();

                    if (this.wantsHead) {
                        return { data: null, count: json.count ?? null, error: null };
                    }

                    if (this.wantsSingle) {
                        if (json.data === null) {
                            return {
                                data: null,
                                error: {
                                    message: 'JSON object requested, multiple (or no) rows returned',
                                    code: 'PGRST116',
                                },
                            };
                        }
                        return { data: json.data, error: null };
                    }

                    if (this.wantsMaybeSingle) {
                        const arr = Array.isArray(json.data) ? json.data : [json.data];
                        return { data: arr[0] ?? null, error: null };
                    }

                    return { data: json.data, error: null, count: json.count ?? null };
                }

                lastError = json?.error ?? { message: `HTTP ${res.status}` };
                if (res.status < 500 && res.status !== 408 && res.status !== 429) break;
            } catch (err: any) {
                lastError = {
                    message:
                        err?.name === 'AbortError'
                            ? 'La base de datos tardo demasiado en responder'
                            : err?.message || 'Fallo de red',
                };
            } finally {
                clearTimeout(timer);
            }

            if (attempt < CLIENT_ATTEMPTS - 1) {
                await sleep(300 * 2 ** attempt);
            }
        }

        if (isRead) {
            const stale = this.readFallback(key);
            if (stale !== undefined) {
                console.warn(
                    `[db] Se sirven datos de respaldo para ${this.table}. Motivo:`,
                    lastError?.message || lastError
                );
                return { data: stale, error: lastError };
            }
        }

        return { data: null, error: lastError };
    }

    then<TResult1 = Result, TResult2 = never>(
        onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
    ): PromiseLike<Result | TResult> {
        return this.execute().catch(onrejected);
    }

    finally(onfinally?: (() => void) | null): PromiseLike<Result> {
        return this.execute().finally(onfinally);
    }
}

export function createResilientClient(storage: any) {
    return {
        from(table: string) {
            return new QueryBuilder(table);
        },
        storage,
    };
}
