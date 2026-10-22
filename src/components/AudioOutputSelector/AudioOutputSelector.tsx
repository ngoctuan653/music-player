import React, { useState, useEffect, useRef } from 'react';
import { Speaker, Headphones, Check, ChevronUp } from 'lucide-react';
import { audioOutputService } from '../../services/audioOutputService';

export const AudioOutputSelector: React.FC = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('default');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audioOutputService.init();
    return audioOutputService.subscribe((devs, activeId) => {
      setDevices(devs);
      setActiveDeviceId(activeId);
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const activeDevice = devices.find(d => d.deviceId === activeDeviceId);
  const activeLabel = activeDevice?.label || (activeDeviceId === 'default' ? 'Default Speaker' : 'Output Device');

  // Shorten device label for display in small dock
  const displayLabel = activeLabel
    .replace(/\s*\(Default\)/gi, '')
    .replace(/Audio Device/gi, '')
    .trim()
    .slice(0, 16)
    .trim();

  const isHeadphone = activeLabel.toLowerCase().includes('headphone') || 
                      activeLabel.toLowerCase().includes('tai nghe') || 
                      activeLabel.toLowerCase().includes('airpods') ||
                      activeLabel.toLowerCase().includes('buds');

  const handleSelectDevice = async (deviceId: string) => {
    await audioOutputService.setOutputDevice(deviceId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="audio-output-selector relative select-none text-xs font-mono shrink-0">
      {/* Trigger Button (Bus Pill) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`audio-output-trigger flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all border ${
          isOpen
            ? 'bg-[#2c2c2e] text-white border-zinc-500 shadow-sm'
            : 'bg-[#232323] hover:bg-[#2c2c2e] text-zinc-300 hover:text-white border-white/[0.08]'
        }`}
        title={`Audio Output: ${activeLabel} (Click to switch)`}
      >
        {isHeadphone ? (
          <Headphones className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        ) : (
          <Speaker className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        )}
        <span className="audio-output-label truncate max-w-[95px] font-medium tracking-tight">
          {displayLabel}
        </span>
        <ChevronUp className={`w-3 h-3 text-zinc-500 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="audio-output-popover absolute bottom-full mb-2 right-0 w-[min(16rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] bg-[#1c1c1e] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-50 overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.06] flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            <span>Audio Output</span>
            <span className="text-[9px] text-zinc-500 font-mono">Direct Bus</span>
          </div>

          <div className="max-h-52 overflow-y-auto py-1 space-y-0.5">
            {devices.length === 0 ? (
              <div className="px-3 py-2 text-zinc-500 text-[11px] italic">
                System Default Output
              </div>
            ) : (
              devices.map((device, idx) => {
                const isSelected = device.deviceId === activeDeviceId || (activeDeviceId === 'default' && idx === 0);
                const isDeviceHeadphones = device.label.toLowerCase().includes('headphone') ||
                                           device.label.toLowerCase().includes('tai nghe') ||
                                           device.label.toLowerCase().includes('airpods');
                const cleanLabel = device.label || `Output Device ${idx + 1}`;

                return (
                  <button
                    key={device.deviceId || idx}
                    onClick={() => handleSelectDevice(device.deviceId)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-[#fc3c44]/15 text-[#fc3c44] font-medium'
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {isDeviceHeadphones ? (
                        <Headphones className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      ) : (
                        <Speaker className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      )}
                      <span className="truncate">{cleanLabel}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#fc3c44] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
