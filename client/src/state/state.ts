import { atom } from 'jotai'
import { persisted, unwrapState, createPersistedAtom, Persistable } from './storage'
import { createAtomHooks } from './statehooks'

export type Course = {
    id: string
    name: string
}

export type State = {
    auth: {
        token: Persistable<string>
        onRequestError: (response: any) => void
    }
    toggleRefactor: () => void
    courses: Course[]
}

const { value: initialState, persistedPaths } = unwrapState<State>({
    auth: {
        token: persisted('login-token', ''),
        onRequestError: (response: any) => {},
    },
    toggleRefactor: () => {},
    courses: [],
})

const baseAtom = atom(
    initialState,
    (get, set, update: State) => {
        set(baseAtom, update)
    }
)

const stateAtom = createPersistedAtom(baseAtom, persistedPaths)

const selectorAtomMap: Record<string, any> = {}
export const { useAtomGetter: useStateValue, useSetAtomValue: useSetStateValue } = createAtomHooks(stateAtom, selectorAtomMap)