import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Settings, Moon, Sun, Download, Clock, CalendarIcon as Calendar, Search, X, Activity, Newspaper } from 'lucide-react';
import { format as formatDFNS } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

import { cn } from './lib/utils';
import { getCountryCode } from './lib/fifa-utils';
import { matchData, timezones, groupTeams, stages, stageMap } from './data';
import LiveScore from './components/LiveScore';
import MatchCard from './components/MatchCard';
import MatchDashboard from './components/MatchDashboard';
import NewsFeed from './components/NewsFeed';
import NextMatchBanner from './components/NextMatchBanner';
import ParticleBackground from './components/ParticleBackground';

function App() {
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fifa_tz');
      if (stored) return stored;
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (e) {
        return 'Asia/Kolkata';
      }
    }
    return 'Asia/Kolkata';
  });

  const [activeTab, setActiveTab] = useState<'matches'|'stats'|'news'>('matches');
  const [stage, setStage] = useState<string>('Group');
  const [group, setGroup] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [timeFormat, setTimeFormat] = useState('12h'); 

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('fifa_tz', timezone);
  }, [timezone]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [apiMatches, setApiMatches] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/wc26/games')
      .then(res => res.json())
      .then(data => {
        if (data && data.data && Array.isArray(data.data)) {
          setApiMatches(data.data);
        }
      })
      .catch(e => console.error(e));
  }, []);

  const mergedMatches = useMemo(() => {
    if (!apiMatches.length) return matchData;
    return matchData.map(m => {
      // Find matching game by home/away teams
      const liveGame = apiMatches.find(apiM => 
        (apiM.home_team_en && apiM.home_team_en.toLowerCase() === m.home.toLowerCase()) && 
        (apiM.away_team_en && apiM.away_team_en.toLowerCase() === m.away.toLowerCase())
      );
      if (liveGame) {
        return { 
          ...m, 
          status: liveGame.status || (m as any).status, 
          score: liveGame.home_score !== null ? `${liveGame.home_score} - ${liveGame.away_score}` : (m as any).score,
          dataSource: "live"
        };
      }
      return { ...m, dataSource: "static" };
    });
  }, [apiMatches]);

  const filteredMatches = useMemo(() => {
    if (search.trim()) {
      const s = search.toLowerCase();
      return mergedMatches.filter(
        (m) =>
          m.home.toLowerCase().includes(s) ||
          m.away.toLowerCase().includes(s) ||
          m.city.toLowerCase().includes(s) ||
          m.venue.toLowerCase().includes(s)
      );
    }
    return mergedMatches.filter((m) => m.stage === stage && (stage !== 'Group' || !group || m.group === group));
  }, [stage, group, search, mergedMatches]);

  const groupedByDate = useMemo(() => {
    const res: Record<string, typeof matchData> = {};
    filteredMatches.forEach((m) => {
      const zonedDate = toZonedTime(new Date(m.utc), timezone);
      const dateKey = formatDFNS(zonedDate, 'EEEE, dd MMMM yyyy');
      
      if (!res[dateKey]) res[dateKey] = [];
      res[dateKey].push(m);
    });
    return res;
  }, [filteredMatches, timezone]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    setPdfError(false);
    try {
      const { generateTimetablePDF } = await import('./utils/pdfExport');
      const tzLabel = timezones.find((t) => t.value === timezone)?.label?.split(' – ')[0] || 'IST';
      await generateTimetablePDF(filteredMatches, {
        teamName: search ? search.trim() : null,
        timezone,
        tzLabel,
        downloadImmediately: true
      });
    } catch(e) {
      console.error("Failed to generate PDF", e);
      setPdfError(true);
      setTimeout(() => setPdfError(false), 3000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const tzLabel = timezones.find((t) => t.value === timezone)?.label?.split(' – ')[0] || 'IST';

  // Check URL params for widget mode
  const isWidget = typeof window !== 'undefined' && window.location.search.includes('widget=true');

  if (isWidget) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-[#09091e] text-white' : 'bg-slate-50 text-slate-900'} p-4`}>
        <LiveScore timezone={timezone} timeFormat={timeFormat} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#09091e] text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      {/* Ticker */}
      <div className="bg-fuchsia-950/80 text-fuchsia-200 text-[10px] font-mono py-1 overflow-hidden sticky top-0 z-50 border-b border-fuchsia-900/50">
        <div className="whitespace-nowrap animate-ticker inline-block">
          <span className="mx-4">BREAKING: Messi confirms fitness for opening match vs Algeria</span> • 
          <span className="mx-4">OFFICIAL: MetLife Stadium turf complete ahead of massive Brazil vs Morocco clash</span> • 
          <span className="mx-4">UPDATE: USA manager optimistic as Pulisic returns to training</span> •
          <span className="mx-4">England squad touches down in Dallas for World Cup opener</span>
        </div>
      </div>

      <header className="sticky top-[25px] z-50 border-b border-[var(--border-color)] bg-[var(--bg-color)]/90 backdrop-blur-2xl relative overflow-hidden">
        <ParticleBackground />
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 shrink-0 group">
            <div className="bg-[var(--card-bg)] rounded-xl p-2 border border-[var(--border-color)] shadow-lg shadow-fuchsia-900/20 group-hover:scale-105 transition-transform">
              <svg width="34" height="34" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f0b8ff" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                </defs>
                <rect x="18" y="22" width="44" height="8" rx="2.5" fill="url(#g1)" />
                <rect x="33" y="22" width="8" height="54" rx="2.5" fill="url(#g1)" />
                <rect x="41" y="22" width="20" height="8" rx="2.5" fill="url(#g1)" />
                <path className="animate-pulse" style={{ animationDuration: '3s' }} d="M61 22 Q82 22 82 42 Q82 58 61 58 L41 58 L41 50 L61 50 Q73 50 73 42 Q73 30 61 30 L61 22Z" fill="url(#g1)" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-mono text-fuchsia-500 uppercase tracking-widest">FIFA</div>
              <div className="font-extrabold text-lg tracking-wider uppercase">
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-fuchsia-300 to-fuchsia-600">World Cup </span>
                <span>2026</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 md:ml-auto w-full md:w-auto">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-9 px-3 rounded-lg text-xs font-mono bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-color)] outline-none focus:border-fuchsia-500 flex-1 md:flex-none shadow-sm"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-fuchsia-500 transition-colors shadow-sm"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Global App Nav */}
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-color)]/50">
          <div className="max-w-5xl mx-auto px-4 flex gap-4 overflow-x-auto scrollbar-none text-sm font-bold uppercase tracking-wider font-mono">
            <button onClick={() => setActiveTab('matches')} className={`px-2 py-3 border-b-2 transition-colors ${activeTab === 'matches' ? 'border-fuchsia-500 text-fuchsia-500' : 'border-transparent text-slate-500 hover:text-[var(--text-color)]'}`}>
              <Calendar className="w-4 h-4 inline-block mr-2" /> Matches
            </button>
            <button onClick={() => setActiveTab('stats')} className={`px-2 py-3 border-b-2 transition-colors ${activeTab === 'stats' ? 'border-fuchsia-500 text-fuchsia-500' : 'border-transparent text-slate-500 hover:text-[var(--text-color)]'}`}>
              <Activity className="w-4 h-4 inline-block mr-2" /> Metrics & Stats
            </button>
            <button onClick={() => setActiveTab('news')} className={`px-2 py-3 border-b-2 transition-colors ${activeTab === 'news' ? 'border-fuchsia-500 text-fuchsia-500' : 'border-transparent text-slate-500 hover:text-[var(--text-color)]'}`}>
              <Newspaper className="w-4 h-4 inline-block mr-2" /> Live News
            </button>
          </div>
        </div>
      </header>

      <NextMatchBanner />

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-5xl mx-auto px-4 mt-4 fade-in relative z-20">
          <div className="p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex flex-wrap gap-6 items-center shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Theme</span>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] hover:border-fuchsia-500"
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span className="text-xs font-mono">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Time Format</span>
              <div className="flex bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-1">
                {['12h', '24h', 'ISO'].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTimeFormat(fmt)}
                    className={`px-3 py-1 text-xs font-mono rounded-md ${timeFormat === fmt ? 'bg-fuchsia-500 text-white' : 'text-[var(--muted-text)] hover:text-[var(--text-color)]'}`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto text-xs text-green-500 font-mono">
              ✓ Preferences saved to local storage
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 relative z-20">
        {activeTab === 'news' && <NewsFeed />}
        
        {activeTab === 'stats' && <MatchDashboard />}

        {activeTab === 'matches' && (
          <>
            <div className="mb-6 fade-in">
              <LiveScore timezone={timezone} timeFormat={timeFormat} />
            </div>

            {/* Search */}
            <div className="relative mb-5 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search team, city, venue..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-10 py-3 text-sm text-[var(--text-color)] placeholder:text-slate-500 outline-none focus:border-fuchsia-500 transition-colors font-mono shadow-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-fuchsia-500">
                    <X size={18} />
                  </button>
                )}
              </div>
              <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border font-bold font-mono transition-colors shadow-sm text-sm ${
                  pdfError ? 'bg-red-500/10 text-red-500 border-red-500/50' : 
                  isGeneratingPDF ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 cursor-wait' :
                  'bg-[var(--card-bg)] text-[var(--text-color)] hover:text-fuchsia-500 border-[var(--border-color)] hover:border-fuchsia-500'
                }`}
              >
                <Download size={16} /> 
                <span className="hidden md:inline">
                  {pdfError ? 'FAILED' : isGeneratingPDF ? 'GENERATING...' : 'SAVE TIMETABLE AS PDF'}
                </span>
              </button>
            </div>

            {/* Filters */}
            {!search && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                  {stages.map((stg) => (
                    <button
                      key={stg}
                      onClick={() => { setStage(stg); setGroup(null); }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all duration-200 font-mono uppercase tracking-wide
                        ${stage === stg ? 'text-white border-fuchsia-500 bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-md glow-pink' : 'bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--border-color)] hover:border-fuchsia-500/50'}`}
                    >
                      {stageMap[stg]}
                    </button>
                  ))}
                </div>

                {stage === 'Group' && (
                  <div className="mb-5 fade-in">
                    <div className="flex gap-2 flex-wrap mb-3">
                      <button
                        onClick={() => setGroup(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all ${
                          !group ? 'bg-fuchsia-900/20 border-fuchsia-500 text-fuchsia-500' : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--muted-text)] hover:border-fuchsia-500/50'
                        }`}
                      >
                        ALL GROUPS
                      </button>
                      {'ABCDEFGHIJKL'.split('').map((g) => (
                        <button
                          key={g}
                          onClick={() => setGroup(g)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all ${
                            group === g ? 'bg-fuchsia-900/20 border-fuchsia-500 text-fuchsia-500' : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--muted-text)] hover:border-fuchsia-500/50'
                          }`}
                        >
                          GRP {g}
                        </button>
                      ))}
                    </div>

                    {group && groupTeams[group] && (
                      <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] mb-4 shadow-sm fade-in">
                        <div className="text-xs font-mono text-[var(--muted-text)] uppercase tracking-widest mb-2">
                          Group {group} Teams
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {groupTeams[group].map((team) => (
                            <span key={team} className="text-sm px-3 py-1 rounded-md bg-[var(--accent-bg)] border border-[var(--border-color)] font-medium flex items-center gap-2">
                              <img src={`https://flagcdn.com/w40/${getCountryCode(team)}.png`} alt="" className="w-5 object-contain" /> {team}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="text-xs text-[var(--muted-text)] font-mono mb-4 flex justify-between items-center">
              <div>
                {search 
                  ? `Search results for "${search}": ${filteredMatches.length} match${filteredMatches.length !== 1 ? 'es' : ''}` 
                  : `${stageMap[stage]}${group ? ` · Group ${group}` : ''} · ${filteredMatches.length} matches · Times in ${tzLabel}`}
              </div>
              <button onClick={handleDownloadPDF} className="sm:hidden text-fuchsia-500 p-1 border border-fuchsia-200 rounded">
                <Download size={14}/>
              </button>
            </div>

            <div ref={printRef} className={`space-y-6 fade-in ${!isDarkMode ? 'bg-slate-50' : 'bg-[#09091e]'}`}>
              {filteredMatches.length === 0 ? (
                <div className="text-center py-16 text-[var(--muted-text)] font-mono text-sm">
                  No matches found :(
                </div>
              ) : (
                (Object.entries(groupedByDate) as [string, typeof matchData][]).map(([dateLabel, dateMatches]) => {
                  
                  // Check if today
                  const isTodayLabel = formatDFNS(new Date(), 'EEEE, dd MMMM yyyy') === dateLabel;

                  return (
                  <div key={dateLabel} className="bg-[var(--bg-color)] pt-2 relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`text-sm font-semibold uppercase tracking-widest whitespace-nowrap px-2 py-0.5 rounded ${isTodayLabel ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50' : 'text-fuchsia-500'}`}>
                        {dateLabel} {isTodayLabel && <span className="ml-2 font-bold animate-pulse">TODAY</span>}
                      </div>
                      <div className={cn("flex-1 h-px", isTodayLabel ? "bg-amber-500/30" : "bg-[var(--border-color)]")}></div>
                      <div className="text-[10px] font-mono text-[var(--muted-text)]">
                        {dateMatches.length} match{dateMatches.length !== 1 ? 'es' : ''}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dateMatches.map((m) => {
                        const isKnockout = m.stage !== 'Group';
                        const isFinal = m.stage === 'Final';
                        
                        return (
                          <MatchCard 
                            key={m.id} 
                            match={m} 
                            timezone={timezone} 
                            timeFormat={timeFormat} 
                            isFinal={isFinal} 
                            isKnockout={isKnockout} 
                          />
                        );
                      })}
                    </div>
                  </div>
                )})
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
