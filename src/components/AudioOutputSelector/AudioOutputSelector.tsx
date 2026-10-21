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
  const activeLabel = activeDevice?.label || (activeDeviceId === 'default' ? 'Loa mặc định' : 'Thiết bị xuất');

  // Shorten device label for display in small dock
  const displayLabel = activeLabel
    .replace(/\s*\(Default\)/gi, '')
    .replace(/Audio Device/gi, '')
    .trim()
    .slice(0, 18)
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
    <div ref={containerRef} className="relative select-none text-xs font-mono">
      {/* Trigger Button (Bus Pill) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all border ${
          isOpen
            ? 'bg-[#1e1e24] text-white border-zinc-600 shadow-sm'
            : 'bg-[#131316] hover:bg-[#1a1a20] text-zinc-400 hover:text-zinc-200 border-white/[0.06]'
        }`}
        title={`Đang xuất âm thanh qua: ${activeLabel} (Click để đổi)`}
      >
        {isHeadphone ? (
          <Headphones className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        ) : (
          <Speaker className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        )}
        <span className="truncate max-w-[110px] font-medium tracking-tight">
          {displayLabel}
        </span>
        <ChevronUp className={`w-3 h-3 text-zinc-500 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-64 bg-[#111114] border border-white/[0.08] rounded-lg shadow-2xl p-1 z-50 overflow-hidden backdrop-blur-md">
          <div className="px-2.5 py-1.5 border-b border-white/[0.06] flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            <span>Thiết bị xuất âm (Bus)</span>
            <span className="text-[9px] text-zinc-600">setSinkId</span>
          </div>

          <div className="max-h-52 overflow-y-auto py-1 space-y-0.5">
            {devices.length === 0 ? (
              <div className="px-3 py-2 text-zinc-500 text-[11px] italic">
                Chỉ có Loa mặc định hệ thống
              </div>
            ) : (
              devices.map((device, idx) => {
                const isSelected = device.deviceId === activeDeviceId || (activeDeviceId === 'default' && idx === 0);
                const isDeviceHeadphones = device.label.toLowerCase().includes('headphone') ||
                                           device.label.toLowerCase().includes('tai nghe') ||
                                           device.label.toLowerCase().includes('airpods');
                const cleanLabel = device.label || `Thiết bị phát ${idx + 1}`;

                return (
                  <button
                    key={device.deviceId || idx}
                    onClick={() => handleSelectDevice(device.deviceId)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-red-500/10 text-red-400 font-medium'
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {isDeviceHeadphones ? (
                        <Headphones className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      ) : (
                        <Speaker className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      )}
                      <span className="truncate">{cleanLabel}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-red-500 shrink-0" />
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
