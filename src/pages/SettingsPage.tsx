import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Check, Info, ShieldCheck, Eye, EyeOff, Save } from 'lucide-react';
import { AppSettings } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';

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
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="pb-3 border-b border-[#282828]">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-red-500" />
          <span>Cài đặt ứng dụng</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Tùy chỉnh cấu hình API và hành vi trình phát
        </p>
      </div>

      {/* YouTube Data API Key */}
      <section className="bg-[#181818] border border-[#262626] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Key className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">YouTube Data API v3 Key</h2>
            <p className="text-xs text-gray-400">
              Dùng để tìm kiếm trực tiếp video trên YouTube qua API chính thức của Google
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Nhập khóa API của bạn (ví dụ: AIzaSy...)"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              * Khóa API được lưu cục bộ an toàn trên máy của bạn và không gửi về máy chủ thứ ba.
            </span>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu cài đặt</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 text-[11px] text-gray-400 space-y-1.5 leading-relaxed">
          <p className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            Làm sao để lấy YouTube Data API v3 Key miễn phí?
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-gray-400">
            <li>Truy cập Google Cloud Console (<code className="text-red-400">console.cloud.google.com</code>).</li>
            <li>Tạo một dự án mới (miễn phí).</li>
            <li>Vào mục <strong>APIs & Services</strong> &rarr; Tìm và Bật <strong>YouTube Data API v3</strong>.</li>
            <li>Tạo Credentials dạng <strong>API Key</strong> và dán vào ô bên trên. Google miễn phí 10,000 quota units mỗi ngày.</li>
          </ol>
        </div>
      </section>

      {/* Playback & Desktop Behavior */}
      <section className="bg-[#181818] border border-[#262626] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Hành vi ứng dụng & Windows</h2>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#141414] border border-[#282828] cursor-pointer hover:bg-[#1c1c1c] transition-colors">
            <div>
              <p className="text-xs font-medium text-white">Tự động phát bài tiếp theo</p>
              <p className="text-[11px] text-gray-400">
                Tự động chuyển sang bài tiếp theo trong hàng đợi khi bài hát hiện tại kết thúc
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlayNext}
              onChange={handleToggleAutoPlay}
              className="w-4 h-4 accent-red-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#141414] border border-[#282828] cursor-pointer hover:bg-[#1c1c1c] transition-colors">
            <div>
              <p className="text-xs font-medium text-white">Đóng cửa sổ ẩn xuống Khay hệ thống (Tray)</p>
              <p className="text-[11px] text-gray-400">
                Khi nhấn nút Đóng (X), ứng dụng tiếp tục phát nhạc dưới nền và ẩn vào System Tray
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.closeToTray}
              onChange={handleToggleCloseToTray}
              className="w-4 h-4 accent-red-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Compliance & Policy Reassurance */}
      <section className="bg-[#141414] border border-[#222222] rounded-2xl p-4 flex items-start gap-3 text-xs text-gray-400">
        <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-gray-200">Cam kết tuân thủ chính sách YouTube API</p>
          <p className="text-[11px] leading-relaxed">
            Ứng dụng sử dụng YouTube Embedded IFrame Player API chính thức của Google, không trích xuất trái phép luồng audio/video (audio ripping), không vượt qua DRM hay chặn quảng cáo. Giao diện được thiết kế tối ưu riêng để quản lý trải nghiệm nghe nhạc gọn gàng trên Windows 11.
          </p>
        </div>
      </section>
    </div>
  );
};
