import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import './CourseView.css';
import { useStateValue, useSetStateValue, WorkPage, Lesson, LessonPlan, NoteNode } from '../../state/state';
import toast from 'react-hot-toast';
import { Icon } from '../Icon/Icon';

const QuickPrompts = () => {
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const notes = useStateValue(state => state.currentCourse.settings?.notes);
    const jwt = useStateValue(state => state.auth.token);
    const [tmpText, setTmpText] = useState('');
    const [editingId, setEditingId] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const setState = useSetStateValue();

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId]);

    const sendNotes = useCallback(async (newNotes: NoteNode[]) => {
        const response = await fetch(`/api/course/${selectedCourseId}/settings/notes`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notes: newNotes }),
        });
        if (!response.ok) {
            onRequestError(response, "Error updating notes");
            return;
        }
        const data = await response.json();
        setState(draft => { draft.currentCourse.settings = data });
    }, [jwt, selectedCourseId, onRequestError, setState]);

    const highlight = (text: string) => {
        const parts = text.split(/(@(?:word|sentence)\b)/g);
        return parts.map((part, i) => {
            if (part.match(/@(?:word|sentence)\b/)) {
                return <span key={i} style={{ color: 'var(--coral)' }}>{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const renderFolderItem = (item: NoteNode) => {
        const rotation = item.is_expanded ? 90 : 0;
        return (
            <div key={item.id} className="folder-item" style={{display: 'flex'}}>
                <div style={{ marginRight: '8px', marginBottom: '2px' }}>
                    <Icon name="chevright" rotation={rotation} scale={8} />
                </div>
                {item.id === editingId ? (
                    <input 
                        ref={inputRef}
                        className="folder-item input"
                        type="text" 
                        value={tmpText} 
                        onChange={(e) => { setTmpText(e.target.value) }}
                        onClick={(e) => { setEditingId('') }}
                    />
                ) : (
                    <div onClick={() => { setEditingId(item.id); setTmpText(item.name) }}>{item.name}</div>
                )}
            </div>
        )
    }

    const renderNoteItem = (item: NoteNode) => {
        return (
            <div key={item.id} className="note-item" >
                {item.id === editingId ? (
                    <input 
                        ref={inputRef}
                        className="note-item input"
                        type="text" 
                        value={tmpText} 
                        onChange={(e) => { setTmpText(e.target.value) }}
                        onClick={(e) => { setEditingId('') }}
                    />
                ) : (
                    <span onClick={() => { setEditingId(item.id); setTmpText(item.name) }}>
                        {highlight(item.name)}
                    </span>
                )}
            </div>
        )
    };

    return (
        <div className="notes-editor">
            {/* Top level actions */}
            <div>
                {/* <button onClick={() => handleAddFolder()}>Add Folder</button> */}
                {/* <button onClick={() => handleAddNote()}>Add Note</button> */}
            </div>

            {/* Notes list */}
            <div className="notes-list">
                {notes?.map(note => note.type === 'folder' ? renderFolderItem(note) : renderNoteItem(note))}
            </div>
        </div>
    );
};

const CustomInstructions = () => {
    const settings = useStateValue(state => state.currentCourse.settings);
    const [editing, setEditing] = useState(false);
    const [tempInstructions, setTempInstructions] = useState('');
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const setState = useSetStateValue();

    if (!settings) {
        return null;
    }

    const handleEdit = () => {
        setTempInstructions(settings.customInstructions || '');
        setEditing(true);
    };

    const handleSave = async () => {
        if (tempInstructions === settings.customInstructions) {
            setEditing(false);
            return;
        }

        try {
            const response = await fetch(`/api/course/${selectedCourseId}/settings/custom-instructions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customInstructions: tempInstructions }),
            });

            if (response.ok) {
                const data = await response.json();
                setState(draft => {
                    draft.currentCourse.settings = data;
                });
                setEditing(false);
            } else {
                onRequestError(response, "Error saving custom instructions");
            }
        } catch (error) {
            toast.error('Error saving custom instructions');
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setTempInstructions('');
    };

    return (
        <div className="custom-instructions-container">
            <div
                className="custom-instructions-title"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div>Custom Instructions</div>
                {!editing ? (
                    <Icon scale={12} name="pencil" onClick={handleEdit} style={{ cursor: 'pointer' }} />
                ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Icon scale={12} name="x" onClick={handleCancel} style={{ cursor: 'pointer' }} />
                        <Icon scale={12} name="check" onClick={handleSave} style={{ cursor: 'pointer' }} />
                    </div>
                )}
            </div>
            {!editing ? (
                <div className="custom-instructions">{settings.customInstructions}</div>
            ) : (
                <textarea
                    className="custom-instructions-input"
                    value={tempInstructions}
                    onChange={(e) => setTempInstructions(e.target.value)}
                />
            )}
        </div>
    );
};

const VocabList = () => {
    const settings = useStateValue(state => state.currentCourse.settings);
    if (!settings) {
        return <div className="vocab-list">Loading...</div>;
    }

    return (
        <div className="vocab-list">
            <div>
                Vocabulary
            </div>
            <hr style={{ width: '98%', justifySelf: 'left', border: '1px solid var(--quarter-grey)', margin: '20px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', gap: '10px' }}>
                <input className="vocab-bubble input" placeholder="Word" />
                <input className="vocab-bubble input" placeholder="Definition" />
                <div className="vocab-bubble add">Add</div>
            </div>
            {Object.entries(settings.vocabItems).map(([key, value]) => (
                <div key={key} className="vocab-item">
                    <div className="vocab-word" title={value.word}>{value.word}</div>
                    <div className="vocab-definition" title={value.definition}>{value.definition}</div>
                </div>
            ))}
            <div className="vocab-view-all">
                View All
            </div>
        </div>
    );
}

const SettingsLoader = () => {
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const setState = useSetStateValue();

    const fetchSettings = useCallback(async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/settings`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });
        if (!response.ok) {
            onRequestError(response, "Error fetching course settings");
            return;
        }
        const data = await response.json();
        setState(draft => { draft.currentCourse.settings = data });
    }, [jwt, selectedCourseId, onRequestError, setState]);

    useEffect(() => {
        fetchSettings();

        return () => {
            setState(draft => { draft.currentCourse.settings = null });
        }
    }, [fetchSettings, setState]);

    return null;
}

const LessonPlanList = () => {
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    const fetchLessonPlans = useCallback(async () => {
        const response  = await fetch(`/api/course/${selectedCourseId}/lesson-plans`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });
        if (!response.ok) {
            onRequestError(response, "Error fetching lesson plans");
            return;
        }
        const data = await response.json();
        setLessonPlans(data);
    }, [jwt, selectedCourseId, onRequestError]);

    useEffect(() => {
        fetchLessonPlans();
    }, [fetchLessonPlans]);

    return (
        <div>
            <div className="lesson-plan-list-title">
                Lesson Templates
            </div>
            <div className="auto-flex">
                <div className="lesson-plan-item add-new-lesson-plan">
                    + New Lesson Plan
                </div>
                {lessonPlans.map(lessonPlan => (
                    <div className="lesson-plan-item" key={lessonPlan.id}>{lessonPlan.title}</div>
                ))}
            </div>
        </div>
    );
}

const LessonList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
        });
    }

    return (
        <div className="course-lesson-list">
            <div className="course-lesson-list-title">Lessons</div>
            <div className="course-lesson-list-add-lesson">
                + Start New Lesson
            </div>
                {lessons.map(lesson => (
                <div key={lesson.id} className="course-lesson-item" onClick={() => handleLessonChoice(lesson)}>
                    <div>
                        Lesson {lesson.order_index + 1}: {lesson.name}
                    </div>
                    <div className="course-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
            <div className="lessons-view-all">
                View All
            </div>
        </div>
    );
};

const PracticeList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
        });
    }

    return (
        <div className="practice-lesson-list">
            <div className="practice-lesson-list-title">Quick Practice</div>
            <div className="practice-lesson-list-add-lesson">
                + Start New Practice
            </div>
            {lessons.map(lesson => (
                <div key={lesson.id} className="practice-lesson-item" onClick={() => handleLessonChoice(lesson)}>
                    <div>
                        {lesson.name}
                    </div>
                    <div className="practice-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
            <div className="practice-view-all">
                View All
            </div>
        </div>
    );
};

const CourseView: React.FC = () => {
    const setState = useSetStateValue();
    
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const currentCourse = useStateValue(state => state.currentCourse.content);
    const lessons = useStateValue(state => state.currentCourse.lessons);
    
    const fetchCourse = useCallback(async () => {
        try {
            const response = await fetch(`/api/course/${selectedCourseId}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                setState(draft => {
                    draft.currentCourse.content = null;
                    draft.pageChoice.workPage = WorkPage.AllCourses;
                });
                if (response.status === 404) {
                    setState(draft => { draft.pageChoice.selectedCourse = null });
                }
                onRequestError(response, "Error fetching course");
                return;
            }
            const data = await response.json();
            setState(draft => { draft.currentCourse.content = data });
        } catch (error) {
            toast.error(`Error fetching course`);
            console.error('Error fetching course:', error);
        }
    }, [jwt, selectedCourseId, onRequestError, setState]);
    
    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);
    
    const fetchLessons = useCallback(async () => {
        try {
            const response = await fetch(`/api/course/${selectedCourseId}/lessons`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                onRequestError(response, "Error fetching lessons");
                return;
            }
            const data = await response.json();
            setState(draft => { draft.currentCourse.lessons = data || [] });
        } catch (error) {
            toast.error(`Error fetching lessons`);
            console.error('Error fetching lessons:', error);
        }
    }, [jwt, selectedCourseId, onRequestError, setState]);
    
    useEffect(() => {
        fetchLessons();
    }, [fetchLessons]);

    return (
        <div className="course-view">
            <SettingsLoader />
            <span className="course-title">{currentCourse?.name}</span>
            <div className="course-content-container">
                <div className="course-content-left">
                    <LessonList lessons={lessons.filter(lesson => !lesson.free_practice)} />
                    <div style={{marginTop: '20px'}}>
                        <LessonPlanList />
                    </div>
                    <QuickPrompts />
                </div>
                <div className="course-content-right">
                    <PracticeList lessons={lessons.filter(lesson => lesson.free_practice)} />
                    <VocabList />
                    <CustomInstructions />
                </div>
            </div>
        </div>
    );
};

export default CourseView;
