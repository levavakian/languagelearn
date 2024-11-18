import { atom } from 'jotai'
import { persisted, unwrapState, createPersistedAtom, Persistable } from './storage'
import { createAtomHooks } from './statehooks'

export enum WorkPage {
    Lesson = 'lesson',
    Course = 'course',
    Intro = 'intro'
}

export type Course = {
    id: string
    name: string
}

export type State = {
    auth: {
        token: Persistable<string>
        onRequestError: (response: any) => void
    }
    pageChoice: Persistable<{
        workPage: WorkPage
        selectedCourse: string | null
        selectedLesson: string | null
    }>
    toggleRefactor: () => void
    courses: Course[]
}

const { value: initialState, persistedPaths } = unwrapState<State>({
    auth: {
        token: persisted('login-token', ''),
        onRequestError: (response: any) => {},
    },
    pageChoice: {
        workPage: WorkPage.Intro,
        selectedCourse: null,
        selectedLesson: null,
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
