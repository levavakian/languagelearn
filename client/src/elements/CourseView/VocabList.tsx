import "./VocabList.css";
import { useSetStateValue, VocabItem } from "../../state/state";

import { useState } from "react";
import { useStateValue } from "../../state/state";
import { produce } from "immer";
import toast from "react-hot-toast";
import { Icon } from "../Icon/Icon";

export const VocabList = () => {
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
            console.error(error);
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
            let primaryKey = editingKey;
            if (editingKey !== tempEditWord) {
                draft[tempEditWord] = {...draft[editingKey]};
                draft[tempEditWord].definition = tempEditDefinition;
                draft[tempEditWord].word = tempEditWord;
                delete draft[editingKey];
                primaryKey = tempEditWord;
            } else {
                draft[primaryKey].definition = tempEditDefinition;
            }
            draft[primaryKey].last_used = new Date().toISOString();
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
            return <div key={key} style={{ display: 'flex', flexDirection: 'row' }}>
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