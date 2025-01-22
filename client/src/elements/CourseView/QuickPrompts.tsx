import "./QuickPrompts.css";
import { useStateValue, useSetStateValue, NoteNode } from "../../state/state";
import { useState, useEffect, useRef, useCallback } from "react";
import { produce } from "immer";
import toast from "react-hot-toast";
import { Icon } from "../Icon/Icon";

export const QuickPrompts = () => {
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
    }, [jwt, selectedCourseId, onRequestError, editingId, tmpText, tempNotes, setState]);

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
                {highlight('Welcome to the tooltip prompts editor. Here you can add, edit, and delete tooltip prompts for your course. Just click on a word or sentence when chatting to quickly ask a question about it! Use @word to reference the clicked word, or @sentence to reference the entire clicked message.')}
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