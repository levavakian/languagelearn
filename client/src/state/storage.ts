import { atom, WritableAtom } from 'jotai'
import { produce } from 'immer'
import { Draft } from 'immer'
import { enableMapSet } from 'immer';

enableMapSet();

export type PersistedValue<T> = {
    type: 'persisted'
    key: string
    value: T
}

export function persisted<T>(key: string, defaultValue: T): PersistedValue<T> {
    return {
        type: 'persisted',
        key,
        value: (() => {
            try {
                const stored = localStorage.getItem(key)
                if (stored !== null) {
                    return JSON.parse(stored)
                }
            } catch (e) {
                console.error(`Failed to load ${key} from localStorage:`, e)
            }
            return defaultValue
        })()
    }
}

// Add this utility type
type UnwrapPersistable<T> = T extends Persistable<infer U> ? U : T;

// Modify the unwrapped state type
export type UnwrappedStrippedState<T> = {
  [K in keyof T]:
    UnwrapPersistable<T[K]> extends (...args: any) => any
      ? UnwrapPersistable<T[K]>
      : UnwrapPersistable<T[K]> extends object
        ? {
            [P in keyof UnwrapPersistable<T[K]>]: UnwrapPersistable<UnwrapPersistable<T[K]>[P]>
          }
        : UnwrapPersistable<T[K]>
};

type UnwrappedState<T> = {
    value: UnwrappedStrippedState<T>
    persistedPaths: { path: string[], key: string }[]
}

export function unwrapState<T>(obj: T): UnwrappedState<T> {
    const persistedPaths: { path: string[], key: string }[] = []
    
    function unwrap(obj: any, currentPath: string[] = []): any {
        if (!obj || typeof obj !== 'object') return obj
        
        if (obj.type === 'persisted') {
            persistedPaths.push({
                path: currentPath,
                key: obj.key
            })
            return obj.value
        }
        
        const result: { [key: string]: any } = Array.isArray(obj) ? [] : {}
        for (const [key, value] of Object.entries(obj)) {
            result[key] = unwrap(value, [...currentPath, key])
        }
        return result
    }
    
    return {
        value: unwrap(obj),
        persistedPaths
    }
}

export function createPersistedAtom<T>(
    baseAtom: WritableAtom<T, [T], void>,
    persistedPaths: { path: string[], key: string }[]
) {
    return atom(
        (get) => get(baseAtom),
        (get, set, update: ((state: Draft<T>) => void)) => {
            const prevState = get(baseAtom)
            
            const nextState = produce(prevState, (draft) => {
                update(draft)
                persistedPaths.forEach(({ path, key }) => {
                    let pvalue: any = prevState;
                    let value: any = draft;
                    for (const p of path) {
                        pvalue = pvalue[p];
                        value = value[p];
                    }
                    
                    if (pvalue !== value) {
                        localStorage.setItem(key, JSON.stringify(value))
                    }
                })
            })
            
            set(baseAtom, nextState)
        }
    )
}

export type Persistable<T> = T | PersistedValue<T>