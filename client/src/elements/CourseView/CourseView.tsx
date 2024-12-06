import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import './CourseView.css';
import { useStateValue, useSetStateValue, WorkPage, Lesson, LessonPlan, NoteNode, VocabItem, ModalSelector } from '../../state/state';
import toast from 'react-hot-toast';
import { Icon } from '../Icon/Icon';
import { produce } from 'immer';
import { useQuery } from '@tanstack/react-query'
import { LessonPlanModal } from '../LessonPlanModal/LessonPlanModal';
import { LessonEditModal } from '../LessonEditModal/LessonEditModal';
import { createAssessment } from '../../api/assessment';

const QuickPrompts = () => {
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const notes = useStateValue(state => state.currentCourse.settings?.notes);
    const jwt = useStateValue(state => state.auth.token);
    const [tmpText, setTmpText] = useState('');
    const [editingId, setEditingId] = useState<string>('');
    const [deleteOnCancel, setDeleteOnCancel] = useState<string>('');
    const [tempNotes, setTempNotes] = useState<NoteNode[]>([]);
    const [notExpandedList, setNotExpandedList] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const setState = useSetStateValue();

    useEffect(() => {
        setTempNotes(notes || []);
    }, [notes]);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId, notes]);

    const addNote = (folder: boolean, id?: string) => {
        const newId = crypto.randomUUID();
        const newNote: NoteNode = {
            id: newId,
            name: '',
            type: folder ? 'folder' : 'note',
            children: folder ? [] : undefined,
        };

        const outNotes = produce(tempNotes, draft => {
            if (!id) {
                draft.push(newNote);
                return
            }
            const findAndAddNote = (nodes: NoteNode[]) => {
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    if (node.id === id) {
                        if (node.type === 'folder') {
                            if (!node.children) {
                                node.children = [];
                            }
                            node.children.push(newNote);
                            return true;
                        }

                        nodes.splice(i + 1, 0, newNote);
                        return true;
                    }
                    if (node.children) {
                        if (findAndAddNote(node.children)) {
                            return true;
                        }
                    }
                }
                return false;
            };
            findAndAddNote(draft);
        });
        setDeleteOnCancel(newNote.id);
        return [outNotes, newNote.id, newNote.name] as [NoteNode[], string, string];
    };

    const deleteNote = (id: string) => {
        const outNotes = produce(tempNotes, draft => {
            const findAndDelete = (nodes: NoteNode[]) => {
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    if (node.id === id) {
                        nodes.splice(i, 1);
                        return true;
                        }
                    if (node.children) {
                        if (findAndDelete(node.children)) {
                            return true;
                        }
                    }
                }
                return false;
            }
            findAndDelete(draft);
        });
        return [outNotes, '', ''] as [NoteNode[], string, string];
    };

    const editNote = () => {
        const outNotes = produce(tempNotes, draft => {
            const findAndReplace = (nodes: NoteNode[]) => {
                for (let node of nodes) {
                    if (node.id === editingId) {
                        node.name = tmpText;
                        if (!node.name.trim()) {
                            node.name = node.type === 'folder' ? 'New Folder' : 'New Note';
                        }
                        return true;
                    }
                    if (node.children) {
                        if (findAndReplace(node.children)) {
                            return true;
                        }
                    }
                }
                return false;
            };

            findAndReplace(draft);
        });
        return [outNotes, '', ''] as [NoteNode[], string, string];
    };

    const sendNotes = useCallback(async (func: () => [NoteNode[], string, string]) => {
        const [outNotes, idToSet, textToSet] = func();
        const previousNotes = tempNotes;
        const previousEditingId = editingId;
        const previousTmpText = tmpText;
        
        setTempNotes(outNotes);
        setEditingId(idToSet);
        setTmpText(textToSet);

        try {
            const response = await fetch(`/api/course/${selectedCourseId}/settings/notes`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: outNotes }),
            });
            
            if (!response.ok) {
                setTempNotes(previousNotes);
                setEditingId(previousEditingId);
                setTmpText(previousTmpText);
                onRequestError(response, "Error updating settings");
                return;
            }
            
            const data = await response.json();
            setState(draft => { draft.currentCourse.settings = data });
        } catch (error) {
            setTempNotes(previousNotes);
            setEditingId(previousEditingId);
            setTmpText(previousTmpText);
            toast.error('Error updating notes');
        }
    }, [jwt, selectedCourseId, onRequestError, editingId, tmpText, tempNotes]);

    const highlight = (text: string) => {
        const parts = text.split(/(@(?:word|sentence)\b)/g);
        return parts.map((part, i) => {
            if (part.match(/@(?:word|sentence)\b/)) {
                return <span key={i} style={{ color: 'var(--coral)' }}>{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const itemActions = (item: NoteNode) => {
        return  <div className="item-actions">
                        <Icon 
                            name="bin" 
                            scale={10} 
                            style={{ cursor: 'pointer', marginLeft: '8px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                sendNotes(() => deleteNote(item.id));
                            }}
                        />
                        <Icon 
                            name="pencil" 
                            scale={10} 
                            style={{ cursor: 'pointer', marginLeft: '8px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(item.id);
                                setTmpText(item.name);
                            }}
                        />
                        <Icon 
                            name="plus" 
                            scale={10} 
                            style={{ cursor: 'pointer', marginLeft: '8px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                sendNotes(() => addNote(false, item.id));
                            }}
                        />
                        <Icon 
                            name="addfolder" 
                            scale={10} 
                            style={{ cursor: 'pointer', marginLeft: '8px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                sendNotes(() => addNote(true, item.id));
                            }}
                        />
        </div>
    }

    const editActions = (item: NoteNode) => {
        return <div className="item-actions always-on">
            <div className="individual-item-actions">
                <Icon name="x" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (deleteOnCancel === editingId) {
                            sendNotes(() => deleteNote(editingId));
                        }
                        setEditingId('');
                        setTmpText('');
                        setDeleteOnCancel('');
                    }}
                    />
            </div>
            
            <div className="individual-item-actions">
                <Icon name="check" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        sendNotes(editNote);
                    }}
                />  
            </div>
        </div>
    }

    const topActions = () => {
        return <div className="item-actions always-on" style={{ marginTop: '10px', marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', }}>
            <Icon name="plus" scale={10} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    sendNotes(() => addNote(false));
                }}
            />
            <Icon name="addfolder" scale={10} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    sendNotes(() => addNote(true));
                }}
            />
        </div>
    }

    const actions = (item: NoteNode) => {
        return item.id === editingId ? editActions(item) : itemActions(item);
    }

    const renderNotes = (notesList: NoteNode[], isRoot?: boolean) => {
        return <div className="notes-list">
            {notesList?.map(note => renderItem(note, isRoot))}
        </div>
    }

    const renderTitle = (item: NoteNode) => {
        const icon = !notExpandedList.has(item.id) ? 'folder' : 'folderDown';
        const prefix = item.type === 'folder' ? "folder" : "note";
        const textClass = `${prefix}-item`;
        const text = item.id === editingId ? <input 
            ref={inputRef}
            className={textClass + ' input'}
            type="text"
            placeholder={item.type === 'folder' ? 'New Folder' : 'New Note'}
            value={tmpText} 
            onChange={(e) => { setTmpText(e.target.value) }}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && tmpText.trim()) {
                    sendNotes(editNote);
                }
            }}
            /> : <div style={{ wordBreak: 'break-word' }}>
                {highlight(item.name)}
            </div>;

        return <div className="folder-title">
            {prefix === 'folder' &&
                <Icon style={{ cursor: 'pointer', marginTop: '1px', marginRight: '8px'}} name={icon} scale={16}
                    onClick={() => {
                        setNotExpandedList(prevList => {
                            const newSet = new Set(prevList);
                            if (newSet.has(item.id)) {
                                newSet.delete(item.id);
                            } else {
                                newSet.add(item.id);
                            }
                            return newSet;
                        });
                    }}
                />}
            {text}
            {actions(item)}
        </div>
    }

    const renderItem = (item: NoteNode, isRoot?: boolean) => {
        const prefix = item.type === 'folder' ? "folder" : "note";
        const itemClass = `${prefix}-item` + (isRoot ? ' root-note-item' : '');

        return (
            <div id={item.id} key={item.id} className={itemClass}>
                {renderTitle(item)}
                {item.children && !notExpandedList.has(item.id) && renderNotes(item.children)}
            </div>
        )
    }

    return (
        <div className="notes-editor-container">
            <div className="notes-editor-title">Tooltip Prompts</div>
            <div className="notes-editor-info">
                Welcome to the tooltip prompts editor. Here you can add, edit, and delete tooltip prompts for your course. Just click on a word or sentence when chatting to quickly ask a question about it! Use @word to reference the clicked word, or @sentence to reference the entire clicked message.
            </div>
            <div className="notes-editor">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginLeft: '20px', marginTop: '10px', alignItems:'baseline'}}>
                    <div>Add a new prompt or folder!</div>
                    {topActions()}
                </div>
                {notes && renderNotes(tempNotes, true)}
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
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const setState = useSetStateValue();
    const [viewAll, setViewAll] = useState(false);
    
    const [tempAddWord, setTempAddWord] = useState('');
    const [tempAddDefinition, setTempAddDefinition] = useState('');

    const [editingKey, setEditingKey] = useState<string>('');
    const [tempEditWord, setTempEditWord] = useState('');
    const [tempEditDefinition, setTempEditDefinition] = useState('');

    if (!settings) {
        return <div className="vocab-list">Loading...</div>;
    }

    const doRequest = async (vocabItems: Record<string, VocabItem>) => {
        try {
            const response = await fetch(`/api/course/${selectedCourseId}/settings/vocab-items`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ vocabItems: vocabItems }),
            });

            if (!response.ok) {
                onRequestError(response, "Error saving vocabulary");
                return;
            }

            const data = await response.json();
            setState(draft => {
                draft.currentCourse.settings = data;
            });
            setEditingKey('');
            setTempAddWord('');
            setTempAddDefinition('');
        } catch (error) {
            toast.error('Error saving vocabulary');
        }
    }

    const handleDelete = async (key: string) => {
        const newVocabItems = produce(settings?.vocabItems || {}, draft => {
            delete draft[key];
        });

        await doRequest(newVocabItems);
    }

    const handleAddNew = async () => {
        if (!tempAddWord || !tempAddDefinition) {
            toast.error('Please enter a word and definition', {id: 'vocab-add-error'});
            return;
        }
        const newVocabItems = produce(settings?.vocabItems || {}, draft => {
            draft[tempAddWord] = {
                word: tempAddWord,
                definition: tempAddDefinition,
                last_used: new Date().toISOString(),
                usageCount: 0,
                type: 'user-provided'
            };
        });

        await doRequest(newVocabItems);
    }

    const handleEdit = async () => {
        if (!tempEditWord || !tempEditDefinition) {
            toast.error('Please enter a word and definition', {id: 'vocab-add-error'});
            return;
        }
        const newVocabItems = produce(settings?.vocabItems || {}, draft => {
            if (editingKey !== tempEditWord) {
                draft[tempEditWord] = draft[editingKey];
                draft[editingKey].definition = tempEditDefinition;
                delete draft[editingKey];
            } else {
                draft[editingKey].definition = tempEditDefinition;
            }
            draft[editingKey].last_used = new Date().toISOString();
        });
        await doRequest(newVocabItems);
    }

    const actionItems = (key: string, value: VocabItem) => {
        return <div className="vocab-item-actions">
                <Icon name="bin" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}
                    onClick={() => handleDelete(key)}
                />
                <Icon name="pencil" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }} 
                    onClick={() => {
                        setEditingKey(key);
                        setTempEditWord(value.word);
                        setTempEditDefinition(value.definition);
                    }}
                />
        </div>
    }

    const editItems = (key: string, value: VocabItem) => {
        return <div className="vocab-item-actions">
                <Icon name="x" scale={12} style={{ cursor: 'pointer', marginTop: '15px', marginLeft: '8px', marginRight: '20px' }}
                    onClick={() => {
                        if (editingKey === key) {
                            setEditingKey('');
                            setTempEditWord('');
                            setTempEditDefinition('');
                        }
                    }}
                />
        </div>
    }

    const renderItem = (key: string, value: VocabItem) => {
        if (editingKey === key) {
            return <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', flexDirection: 'row', gap: '10px', marginTop: '10px' }}>
                    <input className="vocab-bubble input" placeholder="Word" value={tempEditWord} onChange={(e) => setTempEditWord(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter' && tempEditWord && tempEditDefinition) {
                                handleEdit();
                            }
                        }}
                    />
                    <input className="vocab-bubble input" placeholder="Definition" value={tempEditDefinition} onChange={(e) => setTempEditDefinition(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter' && tempEditWord && tempEditDefinition) {
                                handleEdit();
                            }
                        }}
                    />
                    <div className="vocab-bubble add" style={{ cursor: 'pointer', marginRight: '0px' }} 
                        onClick={handleEdit}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter' && tempEditWord && tempEditDefinition) {
                                handleEdit();
                            }
                        }}>
                    Update</div>
                </div>
                <div style={{ whiteSpace: 'nowrap',justifyContent: 'flex-end' }}>
                    {editItems(key, value)}
                </div>
            </div>
        }

        return <div key={key} className="vocab-item-container">
            <div className="vocab-item">
                <div className="vocab-word" title={value.word}>{value.word}</div>
                <div className="vocab-definition" title={value.definition}>{value.definition}</div>
            </div>
            {actionItems(key, value)}
        </div>
    }

    return (
        <div className="vocab-list">
            <div>
                Vocabulary
            </div>
            <hr style={{ width: '98%', justifySelf: 'left', border: '1px solid var(--quarter-grey)', margin: '20px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', gap: '10px' }}>
                <input className="vocab-bubble input" placeholder="Word" value={tempAddWord} onChange={(e) => setTempAddWord(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && tempAddWord && tempAddDefinition) {
                            handleAddNew();
                        }
                    }}/>
                <input className="vocab-bubble input" placeholder="Definition" value={tempAddDefinition} onChange={(e) => setTempAddDefinition(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && tempAddWord && tempAddDefinition) {
                            handleAddNew();
                        }
                    }}
                />
                <div className="vocab-bubble add" onClick={handleAddNew} style={{ cursor: 'pointer' }}>Add</div>
            </div>
            {Object.entries(settings.vocabItems || {})
                .sort(([, a], [, b]) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
                .slice(0, viewAll ? undefined : 4)
                .map(([key, value]) => renderItem(key, value))}
            {!viewAll && Object.keys(settings.vocabItems || {}).length > 4 && (
                <div className="vocab-view-all" style={{ cursor: 'pointer' }} onClick={() => setViewAll(true)}>
                    View All
                </div>
            )}
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
    const setState = useSetStateValue();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);
    const modalSelector = useStateValue(state => state.modalSelector);

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
    }, [fetchLessonPlans, modalSelector]);

    return (
        <div>
            <div className="lesson-plan-list-title">
                Lesson Templates
            </div>
            <div className="auto-flex">
                <div className="lesson-plan-item add-new-lesson-plan" onClick={() => {setSelectedLessonPlan(null); setState(draft => {draft.modalSelector = ModalSelector.LessonPlan})}}>
                    + New Lesson Template
                </div>
                {lessonPlans
                    ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .map(lessonPlan => (
                        <div className="lesson-plan-item text-truncate" key={lessonPlan.id} onClick={() => {setSelectedLessonPlan(lessonPlan); setState(draft => {draft.modalSelector = ModalSelector.LessonPlan})}}>{lessonPlan.title}</div>
                ))}
            </div>
            {modalSelector === ModalSelector.LessonPlan && <LessonPlanModal lessonTemplateExisting={selectedLessonPlan} />}
        </div>
    );
}

const LessonList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [viewAll, setViewAll] = useState(false);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);
    const modalSelector = useStateValue(state => state.modalSelector);

    useEffect(() => {
        setViewAll(false);
    }, [selectedCourseId]);

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
        });
    }

    const handleDelete = async (lessonId: string) => {
        if (!window.confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
            return;
        }

        const response = await fetch(`/api/lesson/${lessonId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });

        if (!response.ok) {
            onRequestError(response, "Failed to delete lesson", "course-view-lesson-delete");
            return;
        }

        setState(draft => {
            draft.currentCourse.lessons = draft.currentCourse.lessons.filter(lesson => lesson.id !== lessonId);
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }

    return (
        <div className="course-lesson-list">
            {lessonToEdit && modalSelector === ModalSelector.LessonEdit && <LessonEditModal lesson={lessonToEdit} />}
            <div className="course-lesson-list-title">Lessons</div>
            <div className="course-lesson-list-add-lesson"
                onClick={() => setState(draft => { draft.modalSelector = ModalSelector.NewLesson })}
            >
                + Start New Lesson
            </div>
            {lessons
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, viewAll ? lessons.length : 4)
                .map(lesson => (
                <div key={lesson.id} className="course-lesson-item group" onClick={() => handleLessonChoice(lesson)}>
                    <div className="flex justify-between items-center w-full">
                        <div>
                            Lesson {lesson.order_index + 1}: {lesson.name}
                        </div>
                        <div className="lesson-actions opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Icon 
                                name="pencil" 
                                scale={14} 
                                style={{ cursor: 'pointer', marginRight: '10px' }} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLessonToEdit(lesson);
                                    setState(draft => { draft.modalSelector = ModalSelector.LessonEdit });
                                }}
                            />
                            <Icon 
                                name="bin" 
                                scale={14} 
                                style={{ cursor: 'pointer' }} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(lesson.id);
                                }}
                            />
                        </div>
                    </div>
                    <div className="course-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
            {!viewAll && lessons.length > 4 && <div className="lessons-view-all" style={{ cursor: 'pointer' }} onClick={() => setViewAll(true)}>
                View All
            </div>}
        </div>
    );
};

const PracticeList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();
    const [viewAll, setViewAll] = useState(false);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    useEffect(() => {
        setViewAll(false);
    }, [selectedCourseId]);

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }

    const handleDelete = async (lessonId: string) => {
        if (!window.confirm('Are you sure you want to delete this practice? This action cannot be undone.')) {
            return;
        }

        const response = await fetch(`/api/lesson/${lessonId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });

        if (!response.ok) {
            onRequestError(response, "Failed to delete practice lesson", "course-view-practice-delete");
            return;
        }

        setState(draft => {
            draft.currentCourse.lessons = draft.currentCourse.lessons.filter(lesson => lesson.id !== lessonId);
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }

    const handleNewPractice = async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/lesson`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: "",
                free_practice: true,
                lesson_plan_content: "Let's have a casual conversation to review what you've learned so far. I'll reference your vocabulary list for context, but feel free to explore any topics or concepts you'd like to practice. We can focus on strengthening your communication skills while naturally incorporating previous material.",
            })
        });

        if (!response.ok) {
            onRequestError(response, "Failed to create practice lesson", "course-view-practice-new");
            return;
        }

        const newLesson = await response.json();

        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = newLesson.id;
        });
    }

    return (
        <div className="practice-lesson-list">
            <div className="practice-lesson-list-title">Quick Practice</div>
            <div className="practice-lesson-list-add-lesson" onClick={handleNewPractice}>
                + Start New Practice
            </div>
            {lessons
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, viewAll ? lessons.length : 4)
                .map(lesson => (
                <div key={lesson.id} className="practice-lesson-item group mt-5 active:translate-y-1 active:shadow-none" onClick={() => handleLessonChoice(lesson)}>
                    <div className="flex justify-between items-center w-full">
                        <div>
                            {lesson.name}
                        </div>
                        <div className="practice-actions opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Icon 
                                name="pencil" 
                                scale={14} 
                                style={{ cursor: 'pointer', marginRight: '10px' }} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.success(`Edit practice: ${lesson.name}`);
                                }}
                            />
                            <Icon 
                                name="bin" 
                                scale={14} 
                                style={{ cursor: 'pointer' }} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(lesson.id);
                                }}
                            />
                        </div>
                    </div>
                    <div className="practice-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
            {!viewAll && lessons.length > 4 && <div className="practice-view-all" style={{ cursor: 'pointer' }} onClick={() => setViewAll(true)}>
                View All
            </div>}
        </div>
    );
};

const Assessment = ({ lessons }: { lessons: Lesson[] }) => {
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const setState = useSetStateValue();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    
    const handleNewAssessment = useCallback(async () => {
        if (!selectedCourseId) {
            toast.error("No course selected, please select a course to create an assessment.");
            return;
        }

        const response = await createAssessment(jwt, selectedCourseId, lessons.length === 0 ? "Initial Assessment" : "Review Assessment");

        if (!response.ok) {
            onRequestError(response, "Failed to create assessment", "course-view-assessment-new");
            return;
        }

        const newLesson = await response.json();

        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = newLesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }, [jwt, onRequestError, selectedCourseId, setState, lessons]);
    
    return (
        <div className="flex flex-col gap-3 mt-4">
            <div className="text-[18px]">
                {lessons.length === 0 
                    ? "Do an initial assessment to determine your current level"
                    : "Ready to check your progress? Do a review assessment to see how you've improved!"}
            </div>
            <button 
                className="px-4 py-2 bg-coral font-semibold text-baby-powder border-2 text-nowrap border-indigo-dye rounded-xl transform active:translate-y-[4px] active:shadow-none shadow-[0_4px_0_var(--indigo-dye)] transition-all self-start"
                onClick={handleNewAssessment}
            >
                Take an Assessment
            </button>
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
        const response = await fetch(`/api/course/${selectedCourseId}/lessons`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        })

        if (!response.ok) {
            onRequestError(response, "Failed to fetch lessons", "course-view-lessons");
            throw new Error("Failed to fetch lessons");
            return;
        }

        return response.json();
    }, [selectedCourseId, jwt, onRequestError]);

    const {isPending: isPendingLessons, error: errorLessons, data: dataLessons} = useQuery({
        queryKey: ['course-view-lessons-' + selectedCourseId],
        queryFn: fetchLessons
    })

    useEffect(() => {
        if (dataLessons) {
            setState(draft => { draft.currentCourse.lessons = dataLessons });
        }
    }, [dataLessons, setState]);

    return (
        <div className="course-view">
            <SettingsLoader />
            <span className="course-title">{currentCourse?.name}</span>
            <div className="course-content-container">
                <div className="course-content-left">
                    <Assessment lessons={lessons.filter(lesson => !lesson.free_practice)}/>
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
                    <div 
                        className="ml-10 text-coral cursor-pointer mt-4 text-sm hover:brightness-75 transition-all"
                        onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                                const response = await fetch(`/api/course/${selectedCourseId}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${jwt}`
                                    }
                                });

                                if (!response.ok) {
                                    onRequestError(response, "Failed to delete course", "course-delete");
                                    return;
                                }

                                // Redirect to courses page after successful deletion
                                setState(draft => {
                                    draft.courses = draft.courses.filter(course => course.id !== selectedCourseId);
                                    draft.pageChoice.workPage = WorkPage.AllCourses;
                                    draft.pageChoice.selectedCourse = null;
                                    draft.currentCourse = {
                                        content: null,
                                        lessons: [],
                                        settings: null
                                    };
                                });
                            }
                        }}
                    >
                        Delete Course
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseView;
