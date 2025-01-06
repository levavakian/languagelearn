import { ModalSelector, useStateValue, Lesson, VocabItem } from "../../state/state";
import { Icon } from "../Icon/Icon";
import { ShowMobileModal, ShowModal } from "../Modal/Modal";
import { useSetStateValue } from "../../state/state";
import { useState, useRef, useEffect, useCallback } from "react";
import { produce } from "immer";
import { smallScreen, useWindowSize } from "../../utils/globals";
import { MobileNav, Tab } from "../Sidebar/MobileNav";
import { IconName } from "../../utils/icons";

export const LessonEditModal = ({ lesson, summaryInput, vocabEdit }: { lesson: Lesson, summaryInput?: string, vocabEdit?: Record<string, VocabItem>}) => {
    const setState = useSetStateValue();
    const settings = useStateValue(state => state.currentCourse.settings);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const [titleText, setTitleText] = useState(lesson.name || "Untitled Lesson");
    const [isEditing, setIsEditing] = useState(false);
    const [summary, setSummary] = useState(summaryInput || lesson.summary || "");
    const [vocab, setVocab] = useState(vocabEdit || {});
    const spanRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [isGenerating, setIsGenerating] = useState(false);
    const [mobileSelection, setMobileSelection] = useState("summary");

    useEffect(() => {
        document.body.style.cursor = isGenerating ? 'wait' : 'default';
        
        // Cleanup function to reset cursor when component unmounts
        return () => {
            document.body.style.cursor = 'default';
        };
    }, [isGenerating]);

    useEffect(() => {
        if (spanRef.current && inputRef.current) {
            const width = spanRef.current.offsetWidth;
            inputRef.current.style.width = `${width + 20}px`;
        }
    }, [titleText, isEditing]);

    const fetchVocabUpdates = useCallback(async () => {
        setIsGenerating(true);
        const response = await fetch(`/api/lesson/${lesson.id}/generate-vocab`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        });
        setIsGenerating(false);

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
                last_used: new Date().toISOString(),
                usageCount: 1
            };
        });

        setVocab(newVocabItems);
    }, [jwt, onRequestError, lesson.id]);

    const fetchSummaryUpdates = useCallback(async () => {
        setIsGenerating(true);
        const response = await fetch(`/api/lesson/${lesson.id}/generate-summary`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        });
        setIsGenerating(false);

        if (!response.ok) {
            onRequestError(response, "Failed to generate lesson plan", "generate-new-lesson-modal");
            return;
        }

        const data = await response.json();
        setSummary(data.summary);
    }, [jwt, onRequestError, lesson.id]);

    const saveLesson = useCallback(async () => {
        setIsGenerating(true);
        const updatedLesson = produce(lesson, draft => {
            draft.name = titleText;
            draft.summary = summary;
        });

        const response = await fetch(`/api/lesson/${lesson.id}`, {
            method: "PUT", 
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedLesson)
        });

        if (!response.ok) {
            onRequestError(response, "Failed to save lesson", "lesson-edit-modal");
        } else {
            const data = await response.json();
            setState(draft => {
                draft.currentCourse.lessons = draft.currentCourse.lessons.map(l => {
                    if (l.id === lesson.id) {
                        return data;
                    }
                    return l;
                });
            });
        }

        const newVocabItems = produce(settings?.vocabItems || {}, draft => {
            Object.entries(vocab).forEach(([word, item]) => {
                let usageCount = 0;
                if (word in draft) {
                    usageCount = draft[word].usageCount + 1;
                }
                draft[word] = {
                    ...item,
                    usageCount: usageCount
                };
            });
        });

        const responseVocab = await fetch(`/api/course/${selectedCourseId}/settings/vocab-items`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ vocabItems: newVocabItems }),
        });

        if (!responseVocab.ok) {
            onRequestError(responseVocab, "Failed to save vocabulary", "lesson-edit-modal-vocab");
        } else {
            setState(draft => { 
                if (draft.currentCourse.settings) {
                    draft.currentCourse.settings.vocabItems = newVocabItems;
                }
            });
        }

        setState(draft => { draft.modalSelector = ModalSelector.None; });
    }, [jwt, onRequestError, settings, vocab, titleText, summary, lesson, selectedCourseId, setState]);

    useWindowSize();

    const renderTitle = () => (
        isEditing ? (
            <div className="flex items-start">
                <div className="relative inline-block">
                    <span
                        ref={spanRef}
                        className="invisible text-nowrap absolute text-[32px] font-bold font-nobel"
                    >
                        {titleText}
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={titleText}
                        onChange={(e) => setTitleText(e.target.value)}
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
                <div className="text-[32px] font-bold text-indigo-dye text-nowrap font-nobel p-0" title={titleText}>{titleText}</div>
                <div className="mt-3 ml-10 mr-auto">
                    <Icon 
                        name="pencil" 
                        scale={16} 
                        className="opacity-20 group-hover:opacity-100 transition-opacity" 
                        />
                </div>
            </div>
        )
    );

    const renderButtons = () => {
        const textSize = smallScreen() ? "16px" : "26px";
        const iconSize = smallScreen() ? 18 : 22;
        const basePadding = smallScreen() ? "14px" : "16px";
        const basePaddingLarge = smallScreen() ? "18px" : "20px";
        
        return (
            <div className="flex ml-2 justify-end gap-4 mt-8">
                <button 
                    style={{ paddingLeft: basePaddingLarge, paddingRight: basePaddingLarge }}
                    className={`py-3 bg-alice-blue text-[${textSize}] hover:bg-alice-blue border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-1 transition-all duration-100`}
                    onClick={() => setState(draft => draft.modalSelector = ModalSelector.None)}
                >
                    Cancel
                </button>
                <button 
                    style={{ paddingLeft: basePadding, paddingRight: basePadding }}
                    className={`py-3 bg-coral hover:bg-coral border-solid border-[1px] border-indigo-dye text-baby-powder rounded-xl font-nobel text-[${textSize}] shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-125 active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center gap-3`}
                    onClick={saveLesson}
                >
                    Save
                    <Icon name="next" scale={iconSize} style={{ marginBottom: '-3px', filter: 'invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(125%) contrast(100%)' }} />
                </button>
            </div>
        );
    };

    if (smallScreen()) {
        const labels: Tab[] = [
            { icon: "ai" as IconName, onClick: () => {setMobileSelection("summary")} },
            { icon: "dictionary" as IconName, onClick: () => {setMobileSelection("vocab")} },
            { icon: "writing" as IconName, onClick: () => {setMobileSelection("plan")} },
        ];

        const renderPlan = () => {
            return <div>
                <div className="text-[20px] font-nobel font-semibold text-indigo-dye mt-4">Lesson Plan</div>
                <div className="mt-4 font-nobel text-indigo-dye bg-transparent mb-6">
                    {lesson.lesson_plan || "No lesson plan available"}
                </div>
            </div>
        }

        const renderSummary = () => {
            return <div className="h-full flex flex-col mr-[26px]">
                <div className="flex-0 ml-[-16px] mb-[12px] mt-4">
                    <button 
                        className={`${isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-alice-blue hover:brightness-105 active:shadow-none active:translate-y-1'} text-nowrap border-solid ml-4 border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel font-semibold text-[16px] px-2 py-1 shadow-[0_4px_0_0_var(--indigo-dye)] transition-all duration-100 flex items-center gap-3`}
                        onClick={() => {!isGenerating && fetchSummaryUpdates()}}
                        disabled={isGenerating}
                    >
                        <Icon name="ai" style={{ marginTop: '1px' }} scale={18} />
                        {isGenerating ? "Generating Summary..." : "Generate Summary"}
                    </button>
                </div>
                <div className="flex-1 w-[90%] mb-12">
                    <textarea
                        value={summary || ""}
                        onChange={(e) => {
                            setSummary(e.target.value);
                        }}
                        className="h-full w-full p-2 px-6 pt-6 resize-none font-nobel text-indigo-dye text-[16px] bg-white border-2 border-indigo-dye rounded-lg outline-none shadow-[0_4px_0_0_var(--indigo-dye)]"
                        placeholder="Add or edit a summary..."
                    />
                </div>
            </div>
        }

        const renderVocab = () => {
            return <div className="h-full flex flex-col pr-[0px]">
                <div className="flex-0 mt-4">
                    <button 
                        className={`${isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-alice-blue hover:brightness-105 active:shadow-none active:translate-y-1'} border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel font-semibold text-[16px] px-2 py-1 shadow-[0_4px_0_0_var(--indigo-dye)] transition-all duration-100 flex items-center gap-3`}
                        onClick={() => {!isGenerating && fetchVocabUpdates()}}
                        disabled={isGenerating}
                    >
                        <Icon name="ai" style={{ marginTop: '1px' }} scale={18} />
                        <div className="text-nowrap">{isGenerating ? "Generating Vocab Updates..." : "Generate Vocab Updates"}</div>
                    </button>
                </div>
                <div className="flex-1 mt-5 mb-5 overflow-y-auto">
                    {Object.entries(vocab)
                        .sort(([, a], [, b]) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
                        .map(([key, value]) => (
                            <div key={key} className="vocab-item-container mt-4">
                                <div className="vocab-item">
                                    <div className="vocab-word" title={value.word}>{value.word}</div>
                                    <div className="vocab-definition" title={value.definition}>{value.definition}</div>
                                </div>
                                <div className="vocab-item-actions">
                                    <Icon name="bin" scale={12} style={{ cursor: 'pointer', marginTop: '8px', marginLeft: '8px', marginRight: '8px' }}
                                        onClick={() => {
                                            setVocab(prev => {
                                                const newVocab = {...prev};
                                                delete newVocab[key];
                                                return newVocab;
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        }
    
        return ShowMobileModal(
            ModalSelector.LessonEdit,
            <div className="h-full flex flex-col">
                {renderTitle()}
                <div className="flex-1 h-full overflow-hidden">
                    <MobileNav 
                        labels={labels} 
                        content={
                            <div className="h-full">
                                {mobileSelection === "plan" ? renderPlan() : null}
                                {mobileSelection === "summary" ? renderSummary() : null}
                                {mobileSelection === "vocab" ? renderVocab() : null}
                            </div>
                        }
                    />
                </div>
                {renderButtons()}
                <div className="pb-5" />
            </div>,
            () => { return true; }
        )
    }

    return ShowModal(
        ModalSelector.LessonEdit,
        <div className="flex flex-col max-w-[1200px]">
            <div style={{ cursor: 'pointer' }}>
                {renderTitle()}
            </div>

            <div className="flex mt-6 relative">
                <div className="w-[60%] pr-8">
                    <div className="font-nobel text-indigo-dye bg-transparent mb-6">
                        {lesson.lesson_plan || "No lesson plan available"}
                    </div>
                    
                    <div className="relative w-[95%]">
                        {<textarea
                            value={summary || ""}
                            onChange={(e) => {
                                setSummary(e.target.value);
                            }}
                            className="w-full min-h-[200px] p-2 px-6 pt-6 pb-16 resize-y font-nobel text-indigo-dye text-[16px] bg-white border-2 border-indigo-dye rounded-lg outline-none shadow-[0_4px_0_0_var(--indigo-dye)]"
                            placeholder="Add a summary..."
                        />}
                        <div className="absolute bottom-4 left-2">
                            <button 
                                className={`${isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-alice-blue hover:brightness-105 active:shadow-none active:translate-y-1'} text-nowrap border-solid ml-4 border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel font-semibold text-[16px] px-2 py-1 shadow-[0_4px_0_0_var(--indigo-dye)] transition-all duration-100 flex items-center gap-3`}
                                onClick={() => {!isGenerating && fetchSummaryUpdates()}}
                                disabled={isGenerating}
                            >
                                <Icon name="ai" style={{ marginTop: '1px' }} scale={18} />
                                Generate Summary
                            </button>
                        </div>
                    </div>
                </div>

                <div className="absolute left-[60%] h-[80%] top-[10%] w-px bg-gray-300"/>

                <div className="w-[40%] pl-8">
                    <span className="text-[24px] font-nobel font-bold text-indigo-dye">
                        Vocabulary
                    </span>
                    
                    {Object.entries(vocab)
                        .sort(([, a], [, b]) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
                        .map(([key, value]) => (
                            <div key={key} className="vocab-item-container mt-4">
                                <div className="vocab-item">
                                    <div className="vocab-word" title={value.word}>{value.word}</div>
                                    <div className="vocab-definition" title={value.definition}>{value.definition}</div>
                                </div>
                                <div className="vocab-item-actions">
                                    <Icon name="bin" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}
                                        onClick={() => {
                                            setVocab(prev => {
                                                const newVocab = {...prev};
                                                delete newVocab[key];
                                                return newVocab;
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        ))}

                    <div className="mt-4">
                        <button 
                            className={`${isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-alice-blue hover:brightness-105 active:shadow-none active:translate-y-1'} border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel font-semibold text-[16px] px-2 py-1 shadow-[0_4px_0_0_var(--indigo-dye)] transition-all duration-100 flex items-center gap-3`}
                            onClick={() => {!isGenerating && fetchVocabUpdates()}}
                            disabled={isGenerating}
                        >
                            <Icon name="ai" style={{ marginTop: '1px' }} scale={18} />
                            {isGenerating ? "Generating Vocab Updates..." : "Generate Vocab Updates"}
                        </button>
                    </div>
                </div>
            </div>
            {renderButtons()}
        </div>,
        () => { return true; },
    );
}