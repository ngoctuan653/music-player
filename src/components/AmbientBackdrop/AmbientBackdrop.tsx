import React, { useEffect, useState } from 'react';
import { playerService } from '../../services/playerService';

export const AmbientBackdrop: React.FC = () => {
  const [image, setImage] = useState<string | null>(playerService.getStatus().currentTrack?.thumbnailUrl || null);

  useEffect(() => playerService.subscribe((status) => {
    setImage(status.currentTrack?.thumbnailUrl || null);
  }), []);

  return (
    <div className="app-backdrop" aria-hidden="true">
      {image && <img src={image} alt="" className="app-backdrop-image" />}
      <div className="app-backdrop-scrim" />
    </div>
  );
};
