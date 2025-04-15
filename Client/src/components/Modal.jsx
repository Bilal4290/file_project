import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, children }) => {
    
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

        {/* Overlay */}
        <div className="absolute inset-0 bg-black opacity-60" onClick={onClose}></div>

        {/* Modal Box */}
        <div className="relative z-10 bg-white rounded-lg shadow-lg p-6 w-[90%] max-w-md">
            {children}
        </div>

    </div>
  );
};

export default Modal;
