import { atom } from 'jotai'
import { persisted, unwrapState, createPersistedAtom, Persistable } from './storage'
import { createAtomHooks } from './statehooks'

export type State = {
    auth: {
        token: Persistable<string>
    }
}

const { value: initialState, persistedPaths } = unwrapState<State>({
    auth: {
        token: persisted('login-token', '')
    }
})

const baseAtom = atom(
    initialState,
    (get, set, update: State) => {
        set(baseAtom, update)
    }
)

const stateAtom = createPersistedAtom(baseAtom, persistedPaths)

const selectorAtomMap: Record<string, any> = {}
export const { useAtomGetter: getStateValue, useSetAtomValue: useSetStateValue } = createAtomHooks(stateAtom, selectorAtomMap)