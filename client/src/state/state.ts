import { atom } from 'jotai'
import { persisted, unwrapState, createPersistedAtom, Persistable } from './storage'
import { createAtomHooks } from './statehooks'

export enum WorkPage {
    Lesson = 'lesson',
    AllCourses = 'all-courses',
    Course = 'course',
    Intro = 'intro'
}

export type Course = {
    id: string
    name: string
}

export type WrappedState = {
    auth: {
        token: Persistable<string>
        onRequestError: (response: any) => void
    }
    pageChoice: Persistable<{
        workPage: WorkPage
        selectedCourse: string | null
        selectedLesson: string | null
    }>
    currentCourse: Course | null
    toggleRefactor: () => void
    courses: Course[]
}

const { value: initialState, persistedPaths } = unwrapState<WrappedState>({
    auth: {
        token: persisted('login-token', ''),
        onRequestError: (response: any) => {},
    },
    pageChoice: {
        workPage: WorkPage.Intro,
        selectedCourse: null,
        selectedLesson: null,
    },
    currentCourse: null,
    toggleRefactor: () => {},
    courses: [],
})

export type State = typeof initialState

const baseAtom = atom(
    initialState,
    (get, set, update: State) => {
        set(baseAtom, update)
    }
)

const stateAtom = createPersistedAtom(baseAtom, persistedPaths)

const selectorAtomMap: Record<string, any> = {}
export const { useAtomGetter: useStateValue, useSetAtomValue: useSetStateValue } = createAtomHooks(stateAtom, selectorAtomMap)
