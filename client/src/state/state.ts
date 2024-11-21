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

export type CourseSettings = {
    id: string
    notes: NoteNode[]
    customInstructions?: string
    vocabItems: Record<string, VocabItem>
}

export type NoteNode = {
    id: string
    name: string
    type: string
    children?: NoteNode[]
    is_expanded?: boolean
    is_editing?: boolean
}

export type VocabItem = {
    type: string
    word: string
    definition: string
    notes?: string
    lastUsed: string
    usageCount: number
}

export type Lesson = {
    id: string
    name: string
    chat_id: string
    updated_at: string
    free_practice: boolean
    order_index: number
}

export type LessonPlan = {
    id: string
    course_id: string
    title: string
    content: string
    created_at: string
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
        settings: CourseSettings | null
    }
    currentChat: {
        chat: Chat | null,
        messages: Message[]
        chatOpts: {
            preferAudio: Persistable<boolean>
            alwaysOn: boolean
            hiddenText: Persistable<boolean>
        }
        lastAudioInTime: number
        latchedResponseId: string
        ws: {
            sendMessage: ((message: string | ArrayBufferLike | Blob | ArrayBufferView) => void) | null
            onMessageCallbacks: Record<string, (data: any) => void>
        }
        audioInput: {
            triggerRecording: () => void,
            triggerStopRecording: () => void,
            hasPermission: boolean,
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
        settings: null,
    },
    currentChat: {
        chat: null,
        messages: [],
        chatOpts: {
            preferAudio: persisted('chat-prefer-audio', false),
            alwaysOn: false,
            hiddenText: persisted('chat-hidden-text', false),
        },
        lastAudioInTime: 0,
        latchedResponseId: "",
        ws: {
            sendMessage: null,
            onMessageCallbacks: {},
        },
        audioInput: {
            triggerRecording: () => { console.log("Trigger recording handler unset") },
            triggerStopRecording: () => { console.log("Trigger stoprecording handler unset") },
            hasPermission: false,
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
