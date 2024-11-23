import { ModalSelector } from "../../state/state";
import { useStateValue, useSetStateValue } from '../../state/state';
import Modal from 'react-modal';
import './Modal.css';
import { Icon } from '../Icon/Icon';

Modal.setAppElement('#root');

export const closeModal = (setState: ReturnType<typeof useSetStateValue>) => {
    setState(draft => { draft.modalSelector = ModalSelector.None });
}

export const ShowModal = (selector: ModalSelector, children: React.ReactNode, onClose?: () => void) => {
    const modalSelector = useStateValue(state => state.modalSelector);
    const setState = useSetStateValue();

    const closeModal = () => {
        setState(draft => { draft.modalSelector = ModalSelector.None });
    }

    return <Modal
        isOpen={modalSelector === selector}
        onRequestClose={() => { onClose?.(); closeModal() }}
        className="Modal"
        overlayClassName="Overlay"
    >
        <div 
            className="modal-close-button"
            onClick={() => { onClose?.(); closeModal() }}
            role="button"
            tabIndex={0}
        >
            <Icon 
                name="x" 
                scale={24} 
                style={{ filter: 'brightness(0) saturate(100%) invert(95%) sepia(2%) saturate(150%) hue-rotate(182deg) brightness(97%) contrast(85%)' }}
            />
        </div>
        {children}
    </Modal>;
}