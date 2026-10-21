import React, { useState, useEffect } from 'react';
import { Sliders, Key, Check, ShieldCheck, Eye, EyeOff, Save, Speaker, Sparkles, Trash2 } from 'lucide-react';
import { AppSettings } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { AudioOutputSelector } from '../components/AudioOutputSelector/AudioOutputSelector';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(LocalStorageManager.getSettings());
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const current = LocalStorageManager.getSettings();
    setSettings(current);
    setApiKeyInput(current.apiKey || '');
  }, []);

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      apiKey: apiKeyInput.trim(),
    };
    LocalStorageManager.saveSettings(updated);
    setSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    const updated: AppSettings = {
      ...settings,
      apiKey: '',
    };
    LocalStorageManager.saveSettings(updated);
    setSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleToggleAutoPlay = () => {
    const updated: AppSettings = {
      ...settings,
      autoPlayNext: !settings.autoPlayNext,
    };
    LocalStorageManager.saveSettings(updated);
    setSettings(updated);
  };

  const handleToggleCloseToTray = () => {
    const updated: AppSettings = {
      ...settings,
      closeToTray: !settings.closeToTray,
    };
    LocalStorageManager.saveSettings(updated);
    setSettings(updated);
  };

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5 select-none text-xs">
      <div className="pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-red-500" />
          <span>CÀI ĐẶT HỆ THỐNG</span>
        </div>
      </div>

      {/* Audio Output Bus Configuration */}
      <section className="bg-[#111114] border border-white/[0.06] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Speaker className="w-4 h-4 text-zinc-300" />
            <div>
              <h2 className="text-xs font-semibold text-zinc-200">Thiết bị xuất âm thanh (Audio Output Bus)</h2>
              <p className="text-[11px] text-zinc-500">
                Chọn loa hoặc tai nghe để ứng dụng định tuyến âm thanh trực tiếp
              </p>
            </div>
          </div>
          <AudioOutputSelector />
        </div>
      </section>

      {/* Direct Search & YouTube Data API Key */}
      <section className="bg-[#111114] border border-white/[0.06] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-xs font-semibold text-zinc-200">YouTube Search Engine & API Key</h2>
              <p className="text-[11px] text-zinc-500">
                Hệ thống tự động sử dụng Direct Search Engine (tìm kiếm trực tiếp không cần API key).
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-mono">
            <Sparkles className="w-3 h-3" />
            DIRECT ENGINE SẴN SÀNG
          </span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-2.5">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Để trống để dùng Direct Search không cần key, hoặc nhập YouTube Data API v3 key..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/[0.08] rounded px-3 py-2 pr-9 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {apiKeyInput && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="px-2.5 py-1 text-zinc-400 hover:text-red-400 bg-white/[0.04] hover:bg-white/[0.08] rounded flex items-center gap-1 text-[11px] font-mono transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa Key (Dùng Direct Search)</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {isSaved ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Đã lưu</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  <span>Lưu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Playback & Desktop Behavior */}
      <section className="bg-[#111114] border border-white/[0.06] rounded-lg p-4 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
          Hành vi Windows
        </h2>

        <div className="space-y-2">
          <label className="flex items-center justify-between p-2.5 rounded bg-[#0a0a0c] border border-white/[0.05] cursor-pointer hover:bg-white/[0.02] transition-colors">
            <div>
              <p className="text-xs text-zinc-300">Tự động chuyển bài tiếp theo</p>
              <p className="text-[10px] text-zinc-500">Phát bài tiếp theo trong hàng đợi khi bài kết thúc</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlayNext}
              onChange={handleToggleAutoPlay}
              className="w-3.5 h-3.5 accent-red-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded bg-[#0a0a0c] border border-white/[0.05] cursor-pointer hover:bg-white/[0.02] transition-colors">
            <div>
              <p className="text-xs text-zinc-300">Ẩn xuống System Tray khi bấm nút Đóng (X)</p>
              <p className="text-[10px] text-zinc-500">Tiếp tục phát nhạc dưới nền khi đóng cửa sổ</p>
            </div>
            <input
              type="checkbox"
              checked={settings.closeToTray}
              onChange={handleToggleCloseToTray}
              className="w-3.5 h-3.5 accent-red-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Direct Stream Resilience Policy */}
      <section className="bg-[#0c0c0f] border border-white/[0.04] rounded-lg p-3 flex items-start gap-2.5 text-zinc-500">
        <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px] leading-relaxed">
          <p className="text-zinc-300 font-medium">Bảo vệ luồng phát & Tuân thủ chính sách</p>
          <p>
            Ứng dụng hỗ trợ Direct Search Engine và Native Header Routing để loại bỏ rào cản hạn chế API Key hoặc lỗi bản quyền (Error 150/101), tôn trọng bản quyền phát nhạc và mang lại trải nghiệm tiện lợi tối đa.
          </p>
        </div>
      </section>
    </div>
  );
};
