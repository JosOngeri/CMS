import React, { useEffect, useRef } from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useColorPalette } from '../../contexts/ColorPaletteContext';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
  showCloseButton = true
}) => {
  const { colors } = useColorPalette()
  const closeButtonRef = useRef(null)
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)

  const sizes = {
    sm: 'max-w-md w-full mx-4 md:mx-auto',
    md: 'max-w-lg w-full mx-4 md:mx-auto',
    lg: 'max-w-2xl w-full mx-4 md:mx-auto',
    xl: 'max-w-4xl w-full mx-4 md:mx-auto',
    full: 'max-w-full mx-2 md:mx-4'
  };

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store previous active element
      previousActiveElement.current = document.activeElement
      
      // Focus close button when modal opens
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus()
        }
      }, 100)
    } else {
      // Return focus to previous element when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  // Focus trap - keep focus within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const handleTab = (e) => {
      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    const modalElement = modalRef.current
    modalElement.addEventListener('keydown', handleTab)

    return () => {
      modalElement.removeEventListener('keydown', handleTab)
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }} aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 md:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                ref={modalRef}
                className={`w-full transform rounded-2xl p-4 md:p-6 text-left align-middle shadow-xl transition-all ${sizes[size]} ${className}`} 
                style={{ backgroundColor: colors.surface, color: colors.text }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                onKeyDown={handleKeyDown}
              >
                <div className="flex items-center justify-between mb-4">
                  {title && (
                    <Dialog.Title
                      id="modal-title"
                      as="h3"
                      className="text-lg md:text-xl font-medium leading-6"
                      style={{ color: colors.text }}
                    >
                      {title}
                    </Dialog.Title>
                  )}
                  {showCloseButton && (
                    <button
                      ref={closeButtonRef}
                      onClick={onClose}
                      className="p-3 md:p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5 md:w-5 md:h-5" style={{ color: colors.textSecondary }} />
                    </button>
                  )}
                </div>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
