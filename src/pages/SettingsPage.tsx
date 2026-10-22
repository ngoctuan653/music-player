import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Key, 
  Check, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Save, 
  Speaker, 
  Sparkles, 
  Trash2, 
  Shield, 
  Server, 
  Lock, 
  Moon, 
  Copy, 
  Activity, 
  ExternalLink 
} from 'lucide-react';
import { AppSettings } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { AudioOutputSelector } from '../components/AudioOutputSelector/AudioOutputSelector';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(LocalStorageManager.getSettings());
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // DoH (DNS-over-HTTPS) & Ad-Shield state
  const [dnsMode, setDnsMode] = useState<'ublock' | 'controld' | 'hagezi' | 'nextdns' | 'cloudflare' | 'adguard' | 'family' | 'custom' | 'off'>('ublock');
  const [ublockUrl, setUblockUrl] = useState('https://my.ublockdns.com/na56bjem');
  const [ublockKey, setUblockKey] = useState('valid glass gravity pipe');
  const [customDnsUrl, setCustomDnsUrl] = useState('');
  const [isDnsSaved, setIsDnsSaved] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    const current = LocalStorageManager.getSettings();
    setSettings(current);
    setApiKeyInput(current.apiKey || '');

    if (window.electronAPI?.getDnsConfig) {
      window.electronAPI.getDnsConfig().then((cfg) => {
        if (cfg) {
          setDnsMode(cfg.mode || 'ublock');
          if (cfg.url) {
            if (cfg.mode === 'ublock') {
              setUblockUrl(cfg.url);
            } else {
              setCustomDnsUrl(cfg.url);
            }
          }
          if (cfg.accountKey) {
            setUblockKey(cfg.accountKey);
          }
        }
      }).catch(() => {});
    }
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

  const handleSaveDns = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (window.electronAPI?.setDnsConfig) {
      const targetUrl = dnsMode === 'ublock' ? ublockUrl.trim() : dnsMode === 'custom' ? customDnsUrl.trim() : undefined;
      await window.electronAPI.setDnsConfig({
        mode: dnsMode,
        url: targetUrl,
        accountKey: dnsMode === 'ublock' ? ublockKey.trim() : undefined,
      });
      setIsDnsSaved(true);
      setTimeout(() => setIsDnsSaved(false), 3000);
    }
  };

  const handleVerifyDns = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    const start = Date.now();
    try {
      const endpoint = dnsMode === 'ublock' ? ublockUrl.trim() : customDnsUrl.trim();
      // RFC 8484 base64url encoded DNS query for google.com
      const testQuery = 'AAABAAABAAAAAAAAA3d3dwd5b3V0dWJlA2NvbQAAAQAB';
      const url = `${endpoint}?dns=${testQuery}`;
      
      let ok = false;
      let status = 0;
      let errMsg = '';

      if (window.electronAPI?.fetchNet) {
        const res = await window.electronAPI.fetchNet(url);
        ok = res.ok;
        status = res.status;
        errMsg = res.error || '';
      } else {
        const res = await fetch(url, { headers: { Accept: 'application/dns-message' } });
        ok = res.ok;
        status = res.status;
      }

      const latency = Date.now() - start;
      if (ok) {
        setVerifyResult({
          ok: true,
          message: `Kết nối thành công (HTTP ${status}) • Độ trễ ${latency}ms • Máy chủ DoH hoạt động ổn định!`,
        });
      } else {
        setVerifyResult({
          ok: false,
          message: `Lỗi kết nối tới endpoint: ${errMsg || `HTTP ${status}`}`,
        });
      }
    } catch (err: any) {
      setVerifyResult({
        ok: false,
        message: `Không thể kết nối tới server DoH: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(ublockKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
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
    <div className="p-6 max-w-5xl mx-auto space-y-6 select-none font-sans">
      <div className="pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-[#fc3c44]" />
          <span>SYSTEM SETTINGS</span>
        </div>
      </div>

      {/* Theme Section */}
      <section className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 text-[#fc3c44]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100">Giao diện Apple Music Dark Mode</h2>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Phong cách tối giản, sang trọng chuẩn Apple Music desktop với tông đen mờ thuần (#131313 / #1c1c1e), loại bỏ hoàn toàn hiệu ứng kính màu mè.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-md border border-[#fc3c44]/30 bg-[#fc3c44]/15 px-3 py-1 text-xs text-[#fc3c44] font-mono font-medium">
            APPLE MUSIC DARK
          </span>
        </div>
      </section>

      {/* DoH & Ad-Shield Configuration */}
      <section className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#fc3c44]/10 border border-[#fc3c44]/20 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-[#fc3c44]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100">
                  Lá chắn DNS-over-HTTPS (DoH) & Chặn quảng cáo
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-mono">
                  <Lock className="w-3 h-3" />
                  {dnsMode !== 'off' ? 'DoH ENCRYPTED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Định tuyến truy vấn mạng qua DNS mã hóa (DoH) kết hợp bộ lọc Electron nội bộ để triệt tiêu quảng cáo, tracker và telemetry từ ngay trước khi bắt đầu tải trang.
              </p>
            </div>
          </div>
        </div>

        {/* DNS Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* uBlock DNS - Primary / Recommended */}
          <button
            type="button"
            onClick={() => setDnsMode('ublock')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'ublock'
                ? 'bg-[#fc3c44]/15 border-[#fc3c44]/50 text-white shadow-sm ring-1 ring-[#fc3c44]/30'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#fc3c44]" />
                <span className="text-xs font-semibold text-zinc-100">uBlock DNS (Khuyên dùng)</span>
              </div>
              {dnsMode === 'ublock' && <Check className="w-4 h-4 text-[#fc3c44]" />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Máy chủ DoH chính thức từ uBlock Origin (my.ublockdns.com), lọc quảng cáo và tracker triệt để theo tài khoản cá nhân
            </p>
          </button>

          {/* Control D */}
          <button
            type="button"
            onClick={() => setDnsMode('controld')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'controld'
                ? 'bg-green-500/10 border-green-500/40 text-white shadow-sm ring-1 ring-green-500/30'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Control D (Node Anycast VN)</span>
              {dnsMode === 'controld' && <Check className="w-4 h-4 text-green-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Node Anycast trực tiếp tại VN (VNPT/Viettel), ping &lt; 10ms, tích hợp chặn Ads & Trackers
            </p>
          </button>

          {/* HaGeZi Multi PRO - Official */}
          <button
            type="button"
            onClick={() => setDnsMode('hagezi')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'hagezi'
                ? 'bg-green-500/10 border-green-500/40 text-white shadow-sm ring-1 ring-green-500/30'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">HaGeZi Multi PRO (DoH)</span>
              {dnsMode === 'hagezi' && <Check className="w-4 h-4 text-green-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Server DoH root.hagezi.org, bộ lọc bảo vệ sạch sẽ toàn diện quảng cáo và tracking
            </p>
          </button>

          {/* NextDNS */}
          <button
            type="button"
            onClick={() => setDnsMode('nextdns')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'nextdns'
                ? 'bg-green-500/10 border-green-500/40 text-white shadow-sm ring-1 ring-green-500/30'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">NextDNS</span>
              {dnsMode === 'nextdns' && <Check className="w-4 h-4 text-green-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Dịch vụ DoH nổi tiếng với node tại Việt Nam (dns.nextdns.io)
            </p>
          </button>

          {/* Cloudflare Security 1.1.1.2 */}
          <button
            type="button"
            onClick={() => setDnsMode('cloudflare')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'cloudflare'
                ? 'bg-green-500/10 border-green-500/40 text-white shadow-sm ring-1 ring-green-500/30'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Cloudflare Security (1.1.1.2)</span>
              {dnsMode === 'cloudflare' && <Check className="w-4 h-4 text-green-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Mạng lưới Anycast lớn nhất toàn cầu, tốc độ cao nhất, chặn mã độc và trang web lừa đảo
            </p>
          </button>

          {/* AdGuard Default */}
          <button
            type="button"
            onClick={() => setDnsMode('adguard')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'adguard'
                ? 'bg-green-500/10 border-green-500/40 text-white shadow-sm ring-1 ring-green-500/30'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">AdGuard DNS (Tiêu chuẩn)</span>
              {dnsMode === 'adguard' && <Check className="w-4 h-4 text-green-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Bộ lọc AdGuard chặn quảng cáo và theo dõi (dns.adguard-dns.com)
            </p>
          </button>

          {/* Custom DoH Endpoint */}
          <button
            type="button"
            onClick={() => setDnsMode('custom')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'custom'
                ? 'bg-green-500/10 border-green-500/40 text-white shadow-sm ring-1 ring-green-500/30'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Tùy chỉnh DoH Endpoint</span>
              {dnsMode === 'custom' && <Check className="w-4 h-4 text-green-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Nhập thủ công URL DoH bất kỳ (AdGuard Home, Pi-hole, NextDNS profile)
            </p>
          </button>

          {/* System Default */}
          <button
            type="button"
            onClick={() => setDnsMode('off')}
            className={`p-3 rounded-lg border text-left transition-all ${
              dnsMode === 'off'
                ? 'bg-white/[0.08] border-white/20 text-white shadow-sm'
                : 'bg-[#232323] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Mặc định hệ thống (Tắt DoH)</span>
              {dnsMode === 'off' && <Check className="w-4 h-4 text-zinc-400" />}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Sử dụng cấu hình DNS mặc định của Windows
            </p>
          </button>
        </div>

        {/* Dedicated uBlock DNS Configuration Card */}
        {dnsMode === 'ublock' && (
          <div className="p-4 rounded-xl bg-[#232323] border border-[#fc3c44]/30 space-y-3.5 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#fc3c44]" />
                <span className="text-xs font-semibold text-white">Cấu hình uBlock DNS của bạn</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open('https://my.ublockdns.com', '_blank')}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  title="Mở uBlock DNS Dashboard"
                >
                  <span>Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-[#fc3c44] bg-[#fc3c44]/15 px-2 py-0.5 rounded border border-[#fc3c44]/30">
                  UBLOCK DOH READY
                </span>
              </div>
            </div>

            {/* DoH Endpoint Input */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-300 font-medium flex items-center justify-between">
                <span>DoH Endpoint URL:</span>
                <span className="text-[10px] font-mono text-zinc-500">RFC 8484 DNS-over-HTTPS</span>
              </label>
              <input
                type="text"
                value={ublockUrl}
                onChange={(e) => setUblockUrl(e.target.value)}
                placeholder="https://my.ublockdns.com/xxxxxx"
                className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#fc3c44]"
              />
            </div>

            {/* Account Key Box */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-300 font-medium flex items-center justify-between">
                <span>Your Account Key (Mã khóa tài khoản):</span>
                <span className="text-[10px] text-zinc-500">No email, no password. Just this key.</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ublockKey}
                  onChange={(e) => setUblockKey(e.target.value)}
                  placeholder="word1 word2 word3 word4"
                  className="flex-1 bg-[#1c1c1e] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono font-medium text-[#fc3c44] placeholder-zinc-500 focus:outline-none focus:border-[#fc3c44]"
                />
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/[0.08]"
                  title="Sao chép khóa tài khoản"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Đã sao chép' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Verify Connection Row */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleVerifyDns}
                disabled={isVerifying || !ublockUrl.trim()}
                className="px-3.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/[0.1] shrink-0 disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 text-[#fc3c44] ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Đang kiểm tra kết nối...' : 'Kiểm tra kết nối uBlock DNS'}</span>
              </button>

              {verifyResult && (
                <span className={`text-[11px] font-mono ${verifyResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {verifyResult.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Custom DoH Endpoint URL Input */}
        {dnsMode === 'custom' && (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-green-400" />
              <span>Custom DoH Endpoint URL:</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: https://dns.nextdns.io/xxxxxx hoặc https://dns.controld.com/xxxxxx"
              value={customDnsUrl}
              onChange={(e) => setCustomDnsUrl(e.target.value)}
              className="w-full bg-[#232323] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-green-500"
            />
          </div>
        )}

        {/* Save DNS Button */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] text-zinc-500 font-mono">
            {isDnsSaved ? '✓ DNS config saved! Restart app to apply to Chromium network stack.' : 'Note: Chromium applies DoH templates on startup.'}
          </span>
          <button
            type="button"
            onClick={handleSaveDns}
            className="px-4 py-2 bg-[#fc3c44] hover:bg-[#e0343b] text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isDnsSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isDnsSaved ? 'Saved' : 'Save DNS Settings'}</span>
          </button>
        </div>
      </section>

      {/* Audio Output Bus Configuration */}
      <section className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Speaker className="w-4 h-4 text-zinc-300" />
            <div>
              <h2 className="text-xs font-semibold text-zinc-200">Audio Output Device</h2>
              <p className="text-[11px] text-zinc-400">
                Select headphones or speakers for direct audio routing
              </p>
            </div>
          </div>
          <AudioOutputSelector />
        </div>
      </section>

      {/* Direct Search & YouTube Data API Key */}
      <section className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-xs font-semibold text-zinc-200">YouTube Search Engine & API Key</h2>
              <p className="text-[11px] text-zinc-400">
                The app automatically uses Direct Search Engine (searches directly without requiring an API key).
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-mono">
            <Sparkles className="w-3 h-3" />
            DIRECT ENGINE READY
          </span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-2.5">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Leave empty to use Direct Search (no key required), or enter YouTube Data API v3 key..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full bg-[#232323] border border-white/[0.08] rounded px-3 py-2 pr-9 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#fc3c44]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
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
                  className="px-2.5 py-1 text-zinc-400 hover:text-[#fc3c44] bg-white/[0.04] hover:bg-white/[0.08] rounded flex items-center gap-1 text-[11px] font-mono transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Key (Use Direct Search)</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#fc3c44] hover:bg-[#e0343b] text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Playback & Desktop Behavior */}
      <section className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl p-4 space-y-3 shadow-sm">
        <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
          Playback & Desktop Behavior
        </h2>

        <div className="space-y-2">
          <label className="flex items-center justify-between p-2.5 rounded bg-[#232323] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
            <div>
              <p className="text-xs text-zinc-200 font-medium">Auto-play next track</p>
              <p className="text-[11px] text-zinc-400">Play next track in queue when current track ends</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlayNext}
              onChange={handleToggleAutoPlay}
              className="w-3.5 h-3.5 accent-[#fc3c44] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded bg-[#232323] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
            <div>
              <p className="text-xs text-zinc-200 font-medium">Minimize to System Tray when closing window (X)</p>
              <p className="text-[11px] text-zinc-400">Keep playing audio in background when window is closed</p>
            </div>
            <input
              type="checkbox"
              checked={settings.closeToTray}
              onChange={handleToggleCloseToTray}
              className="w-3.5 h-3.5 accent-[#fc3c44] rounded cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Direct Stream Resilience Policy */}
      <section className="bg-[#1c1c1e] border border-white/[0.06] rounded-xl p-3.5 flex items-start gap-2.5 text-zinc-400">
        <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px] leading-relaxed">
          <p className="text-zinc-200 font-medium">uBlock DNS & Playback Resilience</p>
          <p>
            The player utilizes Direct Search Engine and Native Stream Routing combined with uBlock DNS DoH to eliminate tracking, quota restrictions, and copyright block errors, providing an ad-free, crystal-clear lossless music experience.
          </p>
        </div>
      </section>
    </div>
  );
};
