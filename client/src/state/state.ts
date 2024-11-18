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

export type Lesson = {
    id: string
    name: string
    chat_id: string
    updated_at: string
    free_practice: boolean
}

export type WrappedState = {
    auth: {
        token: Persistable<string>
        onRequestError: (response: any, msg?: string) => void
    }
    pageChoice: Persistable<{
        workPage: WorkPage
        selectedCourse: string | null
        selectedLesson: string | null
    }>
    currentCourse: {
        content: Course | null,
        lessons: Lesson[],
    }
    toggleRefactor: () => void
    courses: Course[]
}

const { value: initialState, persistedPaths } = unwrapState<WrappedState>({
    auth: {
        token: persisted('login-token', ''),
        onRequestError: (response: any, msg?: string) => {},
    },
    pageChoice: {
        workPage: WorkPage.Intro,
        selectedCourse: null,
        selectedLesson: null,
    },
    currentCourse: {
        content: null,
        lessons: [],
    },
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
