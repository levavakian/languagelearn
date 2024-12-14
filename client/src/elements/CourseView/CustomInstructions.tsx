import "./CustomInstructions.css";
import { useStateValue, useSetStateValue } from "../../state/state";
import { useState } from "react";
import { Icon } from "../Icon/Icon";
import toast from "react-hot-toast";

export const CustomInstructions = () => {
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