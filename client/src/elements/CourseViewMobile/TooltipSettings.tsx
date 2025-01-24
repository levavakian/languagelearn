import { useCallback, useState, useEffect, useRef } from "react";
import { useSetStateValue, useStateValue } from "../../state/state";
import type { NoteNode } from '../../state/state';
import { useCourseInfo } from '../CourseViewMobile/courseHooks';
import { highlight } from "../../utils/display";
import { Icon } from "../Icon/Icon";
import { produce } from 'immer';
import toast from "react-hot-toast";

export const TooltipSettings = () => {
    const setState = useSetStateValue();
    useCourseInfo();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const notes = useStateValue(
        state => state.courseInfo[selectedCourseId || '']?.settings?.notes || null,
        selectedCourseId
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const [tmpText, setTmpText] = useState('');
    const [editingId, setEditingId] = useState<string>('');
    const [deleteOnCancel, setDeleteOnCancel] = useState<string>('');
    const [tempNotes, setTempNotes] = useState<NoteNode[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [lastClickedNote, setLastClickedNote] = useState<string>('');

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [editingId, notes]);

    useEffect(() => {
        if (lastClickedNote !== editingId && editingId && deleteOnCancel === editingId) {
            sendNotes(() => deleteNote(editingId));
            setEditingId('');
            setTmpText('');
            setDeleteOnCancel('');
        }
    }, [lastClickedNote]);

    useEffect(() => {
        setTempNotes(notes || []);
    }, [notes]);

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
        setLastClickedNote(newNote.id);
        if (folder) {
            setExpandedNodes(produce(draft => {
                draft.add(newNote.id);
            }));
        }
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
    }, [jwt, selectedCourseId, onRequestError, editingId, tmpText, tempNotes, setState]);

    const confirmActions = (item: NoteNode) => {
        return <div className="flex flex-row gap-2 flex-end border-none mt-[-3px] py-2 border-solid border-indigo-dye rounded-xl ml-auto">
                <Icon name="x" scale={24} style={{ cursor: 'pointer', marginTop: '5px', marginLeft: '8px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (deleteOnCancel === editingId) {
                            sendNotes(() => deleteNote(editingId));
                        }
                        setLastClickedNote('');
                        setEditingId('');
                        setTmpText('');
                        setDeleteOnCancel('');
                    }}
                />
                <Icon name="check" scale={24} style={{ cursor: 'pointer', marginTop: '5px', marginLeft: '8px', marginRight: '8px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        sendNotes(editNote);
                    }}
                />
        </div>
    }

    const editActions = (item: NoteNode) => {
        return <div className="flex flex-row gap-2 flex-end border-none py-2 mt-[-3px] border-solid border-indigo-dye rounded-xl ml-auto">
            <Icon name="bin" scale={20} style={{ cursor: 'pointer', marginTop: '5px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    sendNotes(() => deleteNote(item.id));
                }}
            />
            <Icon name="pencil" scale={20} style={{ cursor: 'pointer', marginTop: '5px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(item.id);
                    setTmpText(item.name);
                }}
            />
            <Icon name="plus" scale={20} style={{ cursor: 'pointer', marginTop: '5px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    sendNotes(() => addNote(false, item.id));
                }}
            />
            <Icon name="addfolder" scale={30} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    sendNotes(() => addNote(true, item.id));
                }}
            />
        </div>
    }
    
    const renderNotes = (notes: NoteNode[]) => {
        return notes.map((note) => {
            return <div key={note.id}>
                {note.type === 'note' ? (
                    <div key={note.id} className="flex flex-col justify-between">
                        {
                            note.id == editingId ? <input 
                            ref={inputRef}
                            type="text"
                            className="bg-white border-solid border-indigo-dye border-[3px] outline-none text-[20px] text-indigo-dye font-medium rounded-xl flex-1 mt-[-3px] p-4"
                            placeholder={'New Note'}
                            value={tmpText}
                            onClick={(e) => {
                                e.stopPropagation();
                                setLastClickedNote(note.id);
                            }}
                            onChange={(e) => { setTmpText(e.target.value) }}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter' && tmpText.trim()) {
                                    sendNotes(editNote);
                                }
                            }}
                            />:
                            <div className="bg-white border-[3px] border-solid border-indigo-dye text-[20px] font-medium rounded-xl flex-1 mt-[-3px] p-4"
                                onClick={() => {
                                    setLastClickedNote(note.id);
                                }}
                            >
                                {highlight(note.name)}
                            </div>
                        }
                            {lastClickedNote === note.id && (note.id === editingId ? confirmActions(note) : editActions(note))}
                        </div>
                ) : null}
                {note.type === 'folder' ? (
                    <div key={note.id} className="flex flex-col justify-between">
                    {
                        note.id == editingId ? <input 
                        ref={inputRef}
                        type="text"
                        className={`transition-all duration-300 ease-in-out outline-none flex flex-row justify-between border-[3px] border-solid border-indigo-dye text-[20px] font-medium rounded-xl flex-1 mt-[-3px] p-4 ${
                            expandedNodes.has(note.id) 
                                ? 'bg-coral text-baby-powder' 
                                : 'bg-alice-blue text-indigo-dye'
                        }`}
                        key={note.id}
                        placeholder={'New Note'}
                        value={tmpText}
                        onClick={() => {
                            setLastClickedNote(note.id);
                            setExpandedNodes(produce(draft => {
                                if (draft.has(note.id)) {
                                    draft.delete(note.id);
                                } else {
                                    draft.add(note.id);
                                }
                            }));
                        }}
                        onChange={(e) => { setTmpText(e.target.value) }}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter' && tmpText.trim()) {
                                sendNotes(editNote);
                            }
                        }}
                        />:
                        <div className={`transition-all duration-300 ease-in-out flex flex-row justify-between border-[3px] border-solid border-indigo-dye text-[20px] font-medium rounded-xl flex-1 mt-[-3px] p-4 ${
                                expandedNodes.has(note.id) 
                                    ? 'bg-coral text-baby-powder' 
                                    : 'bg-alice-blue text-indigo-dye'
                            }`}
                            onClick={() => {
                                if (note.id !== lastClickedNote && expandedNodes.has(note.id)) {
                                    setLastClickedNote(note.id);
                                    return;
                                }
                                setLastClickedNote(note.id);
                                setExpandedNodes(produce(draft => {
                                    if (draft.has(note.id)) {
                                        draft.delete(note.id);
                                    } else {
                                        draft.add(note.id);
                                    }
                                }));
                            }}
                        >
                            {highlight(note.name)}
                            <Icon scale={16} rotation={expandedNodes.has(note.id) ? -90 : 180} name="arrow" />
                        </div>
                    }
                        {expandedNodes.has(note.id) && lastClickedNote === note.id && (note.id === editingId ? confirmActions(note) : editActions(note))}
                    </div>
                ) : null}
                {note.children && expandedNodes.has(note.id) && <div className="flex flex-row">
                    <div className="ml-8 flex-0"></div>
                    <div className="flex flex-col rounded-lg flex-1">
                        {renderNotes(note.children)}
                    </div>
                </div>}
            </div>
        });
    }

    const renderTooltip = () => {
        if (notes === null) {
            return <div>Loading...</div>;
        }
        return <div className="overflow-auto pb-2 flex flex-col mt-2 pt-2 rounded-lg p-[1px]">{renderNotes(tempNotes)}</div>;
    }

    const topActions = () => {
        return <div className="flex flex-row flex-end ml-auto" style={{ marginTop: '10px', marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', }}>
            <Icon name="plus" scale={20} style={{ cursor: 'pointer', marginTop: '5px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    sendNotes(() => addNote(false));
                }}
            />
            <div className="text-2xl pl-2 font-semibold flex flex-row"></div>
            <Icon name="addfolder" scale={30} style={{ cursor: 'pointer', marginTop: '0px', marginLeft: '8px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    sendNotes(() => addNote(true));
                }}
            />
        </div>
    }

    return <div className="flex flex-col flex-1 ">
        <div className="text-2xl font-semibold flex flex-row">
            Tooltip Settings
        </div>
        <div className="text-lg text-left mt-4">
            {highlight('Welcome to the tooltip prompts editor. Here you can add, edit, and delete tooltip prompts for your course. Just click on a word or sentence when chatting to quickly ask a question about it! Use @word to reference the clicked word, or @sentence to reference the entire clicked message.')}
        </div>
        {topActions()}
        {renderTooltip()}
    </div>
}