import { useState, useEffect } from "react";
import { useStateValue } from "../../state/state";
import { useSetStateValue, VocabItem } from "../../state/state";
import { Icon } from "../Icon/Icon";
import toast from "react-hot-toast";
import { produce } from "immer";
import React from 'react';
import { Dropdown } from "../../utils/Dropdown";
export const VocabMobile = () => {
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const settings = useStateValue(
        state => state.courseInfo[selectedCourseId || '']?.settings || null,
        selectedCourseId
    );
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const setState = useSetStateValue();
    const [clickPos, setClickPos] = useState<{ x: number; y: number; key: string; item: VocabItem } | null>(null);
    
    const [tempAddWord, setTempAddWord] = useState('');
    const [tempAddDefinition, setTempAddDefinition] = useState('');

    const [editingKey, setEditingKey] = useState<string>('');
    const [tempEditWord, setTempEditWord] = useState('');
    const [tempEditDefinition, setTempEditDefinition] = useState('');

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
                draft.courseInfo[selectedCourseId || '']!.settings = data;
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

    const renderItem = (key: string, value: VocabItem) => {
        if (editingKey === key) {
            return <div key={key} className="flex flex-col w-[100%]">
                <div className="flex flex-row justify-between gap-[10px] w-[100%]">
                    <input
                        className="min-w-0 flex-1 px-[5px] py-[10px] rounded-[8px] text-[14px] text-center bg-white placeholder-pink-faded text-pink-faded border-none outline-none"
                        placeholder="Word" value={tempEditWord} onChange={(e) => setTempEditWord(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter' && tempEditWord && tempEditDefinition) {
                                handleEdit();
                            }
                        }}
                    />
                    <input
                        className="min-w-0 flex-1 px-[5px] py-[10px] rounded-[8px] text-[14px] text-center bg-white placeholder-pink-faded text-pink-faded border-none outline-none"
                        placeholder="Definition" value={tempEditDefinition} onChange={(e) => setTempEditDefinition(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter' && tempEditWord && tempEditDefinition) {
                                handleEdit();
                            }
                        }}
                    />
                </div>
                <div className="mt-2"></div>
                <div className="flex flex-row justify-between gap-[10px] w-[100%]">
                    <div
                        className="flex-1 px-[5px] py-[10px] rounded-[8px] text-[14px] text-center bg-pink text-indigo-dye font-semibold border-none outline-none"
                        onClick={() => {
                            setEditingKey('');
                            setTempEditWord('');
                            setTempEditDefinition('');
                        }}
                        style={{ cursor: 'pointer' }}>
                        Cancel
                    </div>
                    <div
                        className="flex-1 px-[5px] py-[10px] rounded-[8px] text-[14px] text-center bg-pink text-indigo-dye font-semibold border-none outline-none"
                        onClick={handleEdit}
                        style={{ cursor: 'pointer' }}>
                        Update
                    </div>
                </div>
            </div>
        }

        return <div key={key} className="flex flex-row p-0 m-0">
            <div
                className="flex flex-row justify-between my-[5px] rounded-[10px] bg-pink w-[100%] py-[8px] text-nowrap overflow-hidden"
                onClick={(e) => {
                    e.stopPropagation();
                    setClickPos({ x: e.clientX, y: e.clientY, key: key, item: value});
                }}
            >
                <div className="ml-[10px] max-w-[45%] text-coral truncate-ellipsis overflow-hidden text-nowrap" title={value.word}>{value.word}</div>
                <div className="mr-[10px] max-w-[45%] text-indigo-dye truncate-ellipsis overflow-hidden text-nowrap" title={value.definition}>{value.definition}</div>
            </div>
        </div>
    }

    useEffect(() => {
        const handleScroll = () => {
            if (clickPos) {
                setClickPos(null);
            }
        };

        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [clickPos]);

    if (!settings) {
        return <div className="vocab-list">Loading...</div>;
    }

    return (
        <div className="flex flex-col flex-1">
            <div className="text-2xl font-semibold flex flex-row">
                Vocab
            </div>
            <div className="mt-4 flex flex-row w-[100%] justify-between gap-[10px]">
                <input 
                    className="min-w-0 flex-1 px-[5px] py-[10px] rounded-[8px] text-[14px] text-center bg-white placeholder-pink-faded text-pink-faded border-none outline-none"
                    placeholder="Word" 
                    value={tempAddWord} 
                    onChange={(e) => setTempAddWord(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && tempAddWord && tempAddDefinition) {
                            handleAddNew();
                        }
                    }}/>
                <input
                    className="min-w-0 flex-1 px-[5px] py-[10px] rounded-[8px] text-[14px] text-center bg-white placeholder-pink-faded text-pink-faded border-none outline-none"
                    placeholder="Definition" 
                    value={tempAddDefinition} 
                    onChange={(e) => setTempAddDefinition(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && tempAddWord && tempAddDefinition) {
                            handleAddNew();
                        }
                    }}
                />
                <div
                    className="shrink-0 flex-1 px-[5px] py-[10px] rounded-[8px] text-[14px] text-center bg-pink text-indigo-dye font-semibold border-none outline-none"
                    onClick={handleAddNew}
                    style={{ cursor: 'pointer' }}>
                    Add
                </div>
            </div>
            <div className="mt-2"></div>
            {Object.entries(settings.vocabItems || {})
                .sort(([, a], [, b]) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
                .map(([key, value]) => renderItem(key, value))}
            {clickPos && <Dropdown x={clickPos.x} y={clickPos.y} onClose={() => {
                setClickPos(null);
            }}>
                <div className="flex flex-col gap-[4px] bg-indigo-dye p-[1px] border-2 border-solid border-indigo-dye rounded-[8px]">
                    <div className="flex bg-alice-blue font-semibold rounded-[6px] p-1 flex-row gap-[6px]"
                        onClick={() => {
                            setEditingKey(clickPos.key);
                            setTempEditWord(clickPos.item.word);
                            setTempEditDefinition(clickPos.item.definition);
                            setClickPos(null);
                        }}
                    >
                        <Icon name="pencil" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}/>
                        <div>Edit</div>
                    </div>
                    <div className="flex bg-alice-blue font-semibold text-warn-red rounded-[6px] p-1 flex-row gap-[6px]"
                        onClick={() => {
                            handleDelete(clickPos.key);
                            setClickPos(null);
                        }}
                    >
                        <Icon name="bin" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }} />
                        <div>Delete</div>
                    </div>
                </div>
            </Dropdown>}
        </div>
    );
}