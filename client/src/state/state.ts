import { atom } from 'jotai'
import { persisted, unwrapState, createPersistedAtom, Persistable } from './storage'
import { createAtomHooks } from './statehooks'
import { smallScreen } from '../utils/globals'

export enum ModalSelector {
    None = 'none',
    BuyCoins = 'buy-coins',
    NewCourse = 'new-course',
    NewLesson = 'new-lesson',
    LessonPlan = 'lesson-plan',
    AlwaysOn = 'always-on',
    LessonEdit = 'lesson-edit',
    Tooltip = 'tooltip',
}

export enum HelpChat {
    None = 'none',
    Mic = 'mic',
    Tooltip = 'tooltip',
    AlwaysOn = 'always-on',
    PreferAudio = 'prefer-audio',
    HiddenText = 'hidden-text',
    Save = 'save',
}

export enum TabSelection {
    Lessons = 'lessons',
    Main = 'main',
    Practice = 'practice',
    Vocab = 'vocab',
    CustomInstructions = 'custom-instructions',
    Tooltip = 'tooltip',
    Templates = 'templates',
}

export enum PreferredInstructorStyle {
    Neutral = 'neutral',
    Strict = 'strict',
    Casual = 'casual',
}

export enum AlwaysOnMode {
    Off = 'off',
    On = 'on',
    Temp = 'temp',
}

export enum WorkPage {
    Chat = 'chat',
    AllCourses = 'all-courses',
    Course = 'course',
    Intro = 'intro',
    Contact = 'contact',
    FAQ = 'faq',
}

export enum MessageType {
    Text = 'text',
    Audio = 'audio',
    Error = 'error',
}

export enum PreferredResponseType {
    Text = 'text',
    Audio = 'audio',
}

export type Course = {
    id: string
    name: string
    updated_at: string
}

export type TooltipInfo = {
    x: number
    y: number
    onSelect: (note: NoteNode) => void
    toRight: boolean
    toDown: boolean
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
    last_used: string
    usageCount: number
}

export type Lesson = {
    id: string
    name: string
    chat_id: string
    updated_at: string
    summary: string
    lesson_plan: string
    free_practice: boolean
    order_index: number
    course_id: string
}

export type LessonPlan = {
    id: string
    course_id: string
    title: string
    content: string
    created_at: string
    updated_at: string
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

export type PageChoice = {
    workPage: WorkPage
    tabSelection: TabSelection
    selectedCourse: string | null
    selectedLesson: string | null
}

export type WrappedState = {
    backspaceFn: ((event: PopStateEvent) => void) | null
    auth: {
        token: Persistable<string>
        onRequestError: (response: any, msg?: string, id?: string) => void
    }
    triggers: {
        key: number
        timeLastPayment: number
        timeLastLessonMod: number
        timeLastLessonPlans: number
    }
    pageChoice: Persistable<PageChoice>
    courseInfo: Record<string, {content: Course | null, lessons: Lesson[], lessonPlans: LessonPlan[], settings: CourseSettings | null}>
    currentCourse: {
        content: Course | null
        lessons: Lesson[]
        settings: CourseSettings | null
    }
    currentChat: {
        chat: Chat | null,
        setChatInput: (msg: string) => void,
        messages: Message[]
        chatOpts: {
            preferAudio: Persistable<boolean>
            alwaysOn: AlwaysOnMode
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
        tooltipInfo: TooltipInfo | null
    }
    courses: Course[]
    modalSelector: ModalSelector
    preferredInstructorStyle: Persistable<PreferredInstructorStyle>
    sidebarOpen: boolean
    helpChat: HelpChat
}

const { value: initialState, persistedPaths } = unwrapState<WrappedState>({
    backspaceFn: null,
    auth: {
        token: persisted('login-token', ''),
        onRequestError: (response: any, msg?: string) => { console.log("Request error handler unset",response,msg) },
    },
    triggers: {
        key: 0,
        timeLastPayment: 0,
        timeLastLessonMod: 0,
        timeLastLessonPlans: 0,
    },
    pageChoice: persisted('page-choice', {
        workPage: WorkPage.Intro,
        tabSelection: TabSelection.Lessons,
        selectedCourse: null,
        selectedLesson: null,
    }),
    courseInfo: {},
    currentCourse: {
        content: null,
        lessons: [],
        settings: null,
    },
    currentChat: {
        chat: null,
        setChatInput: (msg: string) => { console.log("Set chat input handler unset", msg) },
        messages: [],
        chatOpts: {
            preferAudio: persisted('chat-prefer-audio', false),
            alwaysOn: AlwaysOnMode.Off,
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
        },
        tooltipInfo: null,
    },
    courses: [],
    modalSelector: ModalSelector.None,
    preferredInstructorStyle: persisted('preferred-instructor-style', PreferredInstructorStyle.Neutral),
    sidebarOpen: !smallScreen(),
    helpChat: HelpChat.None,
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
