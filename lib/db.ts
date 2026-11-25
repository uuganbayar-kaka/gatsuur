import { Redis } from "@upstash/redis";

type SetOpts = { ex?: number; nx?: boolean };

export interface DB {
  kind: "redis" | "memory";
  ping(): Promise<boolean>;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: SetOpts): Promise<boolean>;
  del(key: string): Promise<void>;
  incrby(key: string, n: number): Promise<number>;
  hset(key: string, field: string, value: unknown): Promise<void>;
  hget<T>(key: string, field: string): Promise<T | null>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  hlen(key: string): Promise<number>;
  lpush(key: string, value: unknown): Promise<void>;
  ltrim(key: string, start: number, stop: number): Promise<void>;
  lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
}

function redisDB(url: string, token: string): DB {
  // cache: "no-store" — Next.js-ийн fetch кэшинд орохгүй байх
  const r = new Redis({ url, token, cache: "no-store", retry: { retries: 3, backoff: (n) => Math.min(1000, 100 * 2 ** n) } });
  return {
    kind: "redis",
    async ping() {
      return (await r.ping()) === "PONG";
    },
    get: (k) => r.get(k),
    async set(k, v, o = {}) {
      const opts = { ...(o.nx ? { nx: true } : {}), ...(o.ex ? { ex: o.ex } : {}) } as { nx: true; ex: number };
      const res = Object.keys(opts).length ? await r.set(k, v, opts) : await r.set(k, v);
      return res === "OK";
    },
    async del(k) {
      await r.del(k);
    },
    incrby: (k, n) => r.incrby(k, n),
    async hset(k, f, v) {
      await r.hset(k, { [f]: v });
    },
    hget: (k, f) => r.hget(k, f),
    async hgetall<T>(k: string) {
      return ((await r.hgetall<Record<string, T>>(k)) ?? {}) as Record<string, T>;
    },
    hlen: (k) => r.hlen(k),
    async lpush(k, v) {
      await r.lpush(k, v);
    },
    async ltrim(k, a, b) {
      await r.ltrim(k, a, b);
    },
    lrange: (k, a, b) => r.lrange(k, a, b),
  };
}

// Зөвхөн локал хөгжүүлэлтэд: процесс дахин асахад өгөгдөл устна.
function memoryDB(): DB {
  const g = globalThis as unknown as { __mem?: Map<string, { v: unknown; exp?: number }> };
  const m = (g.__mem ??= new Map());
  const read = (k: string) => {
    const e = m.get(k);
    if (e?.exp && e.exp < Date.now()) {
      m.delete(k);
      return undefined;
    }
    return e;
  };
  const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const hash = (k: string) => {
    let e = read(k);
    if (!e) m.set(k, (e = { v: {} }));
    return e.v as Record<string, unknown>;
  };
  const list = (k: string) => {
    let e = read(k);
    if (!e) m.set(k, (e = { v: [] }));
    return e.v as unknown[];
  };
  return {
    kind: "memory",
    ping: async () => true,
    async get(k) {
      const e = read(k);
      return e ? clone(e.v as never) : null;
    },
    async set(k, v, o = {}) {
      if (o.nx && read(k)) return false;
      m.set(k, { v: clone(v), exp: o.ex ? Date.now() + o.ex * 1000 : undefined });
      return true;
    },
    async del(k) {
      m.delete(k);
    },
    async incrby(k, n) {
      const e = read(k);
      const v = Number(e?.v ?? 0) + n;
      m.set(k, { v, exp: e?.exp });
      return v;
    },
    async hset(k, f, v) {
      hash(k)[f] = clone(v);
    },
    async hget(k, f) {
      const v = hash(k)[f];
      return v === undefined ? null : (clone(v) as never);
    },
    async hgetall(k) {
      return clone(hash(k)) as never;
    },
    async hlen(k) {
      return Object.keys(hash(k)).length;
    },
    async lpush(k, v) {
      list(k).unshift(clone(v));
    },
    async ltrim(k, a, b) {
      const arr = list(k);
      m.set(k, { v: arr.slice(a, b === -1 ? undefined : b + 1) });
    },
    async lrange(k, a, b) {
      return clone(list(k).slice(a, b === -1 ? undefined : b + 1)) as never;
    },
  };
}

let db: DB | undefined;

export function getDB(): DB {
  if (db) return db;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    db = redisDB(url, token);
  } else if (process.env.VERCEL) {
    // Vercel дээр санах ойн сан ажиллахгүй (инстанс бүр тусдаа) — шууд алдаа өгнө.
    throw new Error("DB_NOT_CONFIGURED: Upstash Redis холбож KV_REST_API_URL, KV_REST_API_TOKEN нэмнэ үү.");
  } else {
    console.warn("[db] Redis тохируулаагүй — санах ойн түр сан ашиглаж байна.");
    db = memoryDB();
  }
  return db;
}
