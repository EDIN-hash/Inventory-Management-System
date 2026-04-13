declare module 'react-modal' {
    import * as React from 'react';

    interface ModalProps {
        isOpen: boolean;
        onRequestClose?: () => void;
        className?: string;
        overlayClassName?: string;
        contentLabel?: string;
        children?: React.ReactNode;
        [key: string]: unknown;
    }

    const Modal: React.FC<ModalProps>;
    export default Modal;
    export function setAppElement(element: string | Element): void;
}
