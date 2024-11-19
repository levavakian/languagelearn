import { atom } from 'jotai'
import { persisted, unwrapState, createPersistedAtom, Persistable } from './storage'
import { createAtomHooks } from './statehooks'

export enum WorkPage {
    Lesson = 'lesson',
    Chat = 'chat',
    AllCourses = 'all-courses',
    Course = 'course',
    Intro = 'intro'
}

export enum MessageType {
    Text = 'text',
    Audio = 'audio',
}

export enum PreferredResponseType {
    Text = 'text',
    Audio = 'audio',
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

export type Chat = {
    id: string
    name: string
    lesson_id: string
}

export type Message = {
    sender: string;
    content: string;
    type: MessageType;
    preferred_response_type: PreferredResponseType;
    response_id: string;
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
        content: Course | null
        lessons: Lesson[]
    }
    currentChat: {
        chat: Chat | null,
        messages: Message[]
        chatOpts: {
            preferAudio: Persistable<boolean>
            alwaysOn: boolean
            hiddenText: Persistable<boolean>
        }
        ws: {
            sendMessage: ((message: string | ArrayBufferLike | Blob | ArrayBufferView) => void) | null
            onMessageCallbacks: Record<string, (data: any) => void>
        }
    }
    toggleRefactor: () => void
    courses: Course[]
}

const { value: initialState, persistedPaths } = unwrapState<WrappedState>({
    auth: {
        token: persisted('login-token', ''),
        onRequestError: (response: any, msg?: string) => { console.log("Request error handler unset",response,msg) },
    },
    pageChoice: persisted('page-choice', {
        workPage: WorkPage.Intro,
        selectedCourse: null,
        selectedLesson: null,
    }),
    currentCourse: {
        content: null,
        lessons: [],
    },
    currentChat: {
        chat: null,
        messages: [],
        chatOpts: {
            preferAudio: persisted('chat-prefer-audio', false),
            alwaysOn: false,
            hiddenText: persisted('chat-hidden-text', false),
        },
        ws: {
            sendMessage: null,
            onMessageCallbacks: {},
        }
    },
    toggleRefactor: () => { console.log("Toggle refactor handler unset") },
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
