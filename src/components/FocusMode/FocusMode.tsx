import React, { useState, useEffect } from 'react';
import { FocusModeVinylView } from './FocusModeVinylView';
import { FocusModeSleeveView } from './FocusModeSleeveView';
import { localStore } from '../../storage/localStore';

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({ isOpen, onClose }) => {
  const [style, setStyle] = useState<'turntable' | 'sleeve'>(() => {
    return localStore.getSettings().focusModeStyle || 'sleeve';
  });

  useEffect(() => {
    if (isOpen) {
      const current = localStore.getSettings().focusModeStyle || 'sleeve';
      setStyle(current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (style === 'turntable') {
    return (
      <FocusModeVinylView
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <FocusModeSleeveView
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};
