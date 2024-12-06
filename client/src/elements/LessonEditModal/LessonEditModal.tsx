import { ModalSelector, AlwaysOnMode, useStateValue, Lesson, VocabItem } from "../../state/state";
import { Icon } from "../Icon/Icon";
import { ShowModal } from "../Modal/Modal";
import { useSetStateValue } from "../../state/state";
import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

export const LessonEditModal = ({ lesson, summaryInput, vocabEdit }: { lesson: Lesson, summaryInput?: string, vocabEdit?: Record<string, VocabItem>}) => {
    const setState = useSetStateValue();
    const [title, setTitle] = useState(lesson.name || "Untitled Lesson");
    const [isEditing, setIsEditing] = useState(false);
    const [summary, setSummary] = useState(summaryInput || lesson.summary || "");
    const [vocab, setVocab] = useState(vocabEdit || {});
    const spanRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    useEffect(() => {
        if (spanRef.current && inputRef.current) {
            const width = spanRef.current.offsetWidth;
            inputRef.current.style.width = `${width + 20}px`;
        }
    }, [title, isEditing]);

    const fetchVocabUpdates = useCallback(async () => {
        const response = await fetch(`/api/lesson/${lesson.id}/generate-vocab`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        });
        
        if (!response.ok) {
            onRequestError(response, "Failed to generate lesson plan", "generate-new-lesson-modal");
            return;
        }

        const data = await response.json();
        
        const newVocabItems: Record<string, VocabItem> = {};
        data.vocab_updates.forEach((item: {
            word: string;
            type: string;
            definition: string;
            notes: string;
        }) => {
            newVocabItems[item.word] = {
                word: item.word,
                type: item.type,
                definition: item.definition,
                notes: item.notes || "",
                last_used: Date.now().toString(),
                usageCount: 1
            };
        });

        setVocab(newVocabItems);
    }, [jwt, onRequestError]);

    return ShowModal(
        ModalSelector.LessonEdit,
        <div className="flex flex-col max-w-[1200px]">
            <div style={{ cursor: 'pointer' }}>
                {isEditing ? (
                    <div className="flex items-start">
                        <div className="relative inline-block">
                            <span
                                ref={spanRef}
                                className="invisible text-nowrap absolute text-[32px] font-bold font-nobel"
                            >
                                {title}
                            </span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setIsEditing(false);
                                    }
                                }}
                                className="text-[32px] font-bold text-indigo-dye font-nobel bg-transparent outline-none border-none p-0 mr-4"
                                autoFocus
                            />
                        </div>
                        <div className="mt-2 mr-auto">
                            <Icon 
                                name="check" 
                                scale={20} 
                                className="opacity-100 group-hover:opacity-100 transition-opacity" 
                                onClick={() => {
                                    setIsEditing(false);
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start group" onClick={(e) => {
                        if (!isEditing) {
                            setIsEditing(true)
                        }
                    }}>
                        <div className="text-[32px] font-bold text-indigo-dye text-nowrap font-nobel p-0" title={title}>{title}</div>
                        <div className="mt-3 ml-10 mr-auto">
                            <Icon 
                                name="pencil" 
                                scale={16} 
                                className="opacity-20 group-hover:opacity-100 transition-opacity" 
                                />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex mt-6 relative">
                <div className="w-[60%] pr-8">
                    <div className="font-nobel text-indigo-dye bg-transparent mb-6">
                        {lesson.lesson_plan || "No lesson plan available"}
                    </div>
                    
                    <textarea
                        value={summary || ""}
                        onChange={(e) => {
                            setSummary(e.target.value);
                        }}
                        className="w-[95%] min-h-[200px] p-2 resize-y font-nobel text-indigo-dye text-[16px] bg-white border-2 border-indigo-dye rounded-lg outline-none shadow-[0_4px_0_0_var(--indigo-dye)]"
                        placeholder="Add a summary..."
                    />

                    <div className="mt-4">
                        <button 
                            className="bg-alice-blue border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel font-semibold text-[16px] px-2 py-1 shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center gap-3"
                            onClick={() => {/* Add your click handler here */}}
                        >
                            <Icon name="ai" style={{ marginTop: '1px' }} scale={18} />
                            Generate Summary
                        </button>
                    </div>
                </div>

                <div className="absolute left-[60%] h-[80%] top-[10%] w-px bg-gray-300"/>

                <div className="w-[40%] pl-8">
                    <span className="text-[24px] font-nobel font-bold text-indigo-dye">
                        Vocabulary
                    </span>
                    <div className="mt-4">
                        <button 
                            className="bg-alice-blue border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel font-semibold text-[16px] px-2 py-1 shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center gap-3"
                            onClick={() => {fetchVocabUpdates()}}
                        >
                            <Icon name="ai" style={{ marginTop: '1px' }} scale={18} />
                            Generate Vocab Updates
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        () => { return true; },
    );
}