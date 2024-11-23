import { ModalSelector } from "../../state/state";
import { useStateValue, useSetStateValue } from '../../state/state';
import Modal from 'react-modal';
import './Modal.css';
import { Icon } from '../Icon/Icon';

Modal.setAppElement('#root');

export const closeModal = (setState: ReturnType<typeof useSetStateValue>) => {
    setState(draft => { draft.modalSelector = ModalSelector.None });
}

export const ShowModal = (selector: ModalSelector, children: React.ReactNode, onClose?: (iconPressed: boolean) => boolean) => {
    const modalSelector = useStateValue(state => state.modalSelector);
    const setState = useSetStateValue();

    const closeModal = () => {
        setState(draft => { draft.modalSelector = ModalSelector.None });
    }

    const handleClose = (iconPressed: boolean = false) => {
        if (!onClose) {
            closeModal();
        } else {
            if (onClose(iconPressed)) {
                closeModal();
            }
        }
    }

    return <Modal
        isOpen={modalSelector === selector}
        onRequestClose={() => { handleClose(false) }}
        className="Modal"
        overlayClassName="Overlay"
    >
        <div className="relative flex flex-col min-h-full">
            <div 
                className="absolute -top-[25px] -right-[25px]"
                onClick={() => { handleClose(true); }}
                role="button"
                tabIndex={0}
            >
                <Icon 
                    name="x" 
                    scale={30} 
                    style={{ filter: 'brightness(0) saturate(100%) invert(95%) sepia(2%) saturate(150%) hue-rotate(182deg) brightness(97%) contrast(85%)' }}
                />
            </div>
            <div>
                {children}
            </div>
        </div>
    </Modal>;
}