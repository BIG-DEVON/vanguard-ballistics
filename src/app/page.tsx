"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Navigation, Plus, Minus, ChevronLeft, ChevronRight, Activity, ShieldAlert, History, Map, Crosshair, Server, RefreshCw, Download } from "lucide-react";

import { calculateFire, applyCorrection, parseGrid } from "@/lib/ballistics";
import { getFiringSolutions, FiringSolution } from "@/lib/firingTable";

interface LogEntry {
  time: string;
  action: string;
  details: string;
}

export default function AutoPlotterDashboard() {
  const [weaponSystem, setWeaponSystem] = useState<string>("81mm_Medium");
  const [gunGrid, setGunGrid] = useState<string>("123456");
  const [targetGrid, setTargetGrid] = useState<string>("127471");
  const [isCorrectionMode, setIsCorrectionMode] = useState<boolean>(false);
  const [correctionMeters, setCorrectionMeters] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DATA' | 'PLOTTER' | 'LOG'>('DATA');
  const [missionLog, setMissionLog] = useState<LogEntry[]>([]);

  const [results, setResults] = useState<{
    range: number;
    bearing: number;
    solutions: FiringSolution[] | null;
    rawGun: { easting: number, northing: number } | null;
    rawTarget: { easting: number, northing: number } | null;
  } | null>(null);

  const isValidGrid = (grid: string) => /^\d+$/.test(grid) && grid.length % 2 === 0 && grid.length >= 4 && grid.length <= 10;

  const addLog = (action: string, details: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setMissionLog(prev => [{ time, action, details }, ...prev]);
  };

  // --- NEW: MASTER RESET LOGIC ---
  const handleReset = () => {
    if (confirm("RE-INITIALIZE SYSTEM? This will clear all telemetry and mission logs.")) {
      setGunGrid("");
      setTargetGrid("");
      setResults(null);
      setMissionLog([]);
      setIsCorrectionMode(false);
      setError(null);
      addLog("SYSTEM RESET", "All telemetry data purged.");
    }
  };

  // --- NEW: EXPORT REPORT LOGIC ---
  const handleExportLog = () => {
    if (missionLog.length === 0) return;
    
    // Format the log into a clean text file
    const logHeader = "VANGUARD TACTICAL - AFTER ACTION REPORT\n" + 
                      "Generated: " + new Date().toLocaleString() + "\n" +
                      "Weapon System: " + weaponSystem.replace('_', ' ') + "\n" +
                      "================================================\n\n";
                      
    const logContent = missionLog.map(log => `[${log.time}] ${log.action}\n> ${log.details}\n`).join('\n');
    
    const blob = new Blob([logHeader + logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vanguard_Mission_Log_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCalculate = (isAutoUpdate = false) => {
    setError(null);
    if (!isValidGrid(gunGrid) || !isValidGrid(targetGrid)) {
      setError("Invalid format. Standard grids require even digits.");
      return;
    }
    const fireData = calculateFire(gunGrid, targetGrid);
    if (fireData) {
      setResults({
        range: fireData.range,
        bearing: fireData.bearingMils,
        solutions: getFiringSolutions(weaponSystem, fireData.range),
        rawGun: parseGrid(gunGrid),
        rawTarget: parseGrid(targetGrid),
      });
      if (!isAutoUpdate) addLog("TARGET ACQUIRED", `Line: ${gunGrid} → Tgt: ${targetGrid} (R: ${fireData.range}m)`);
    } else {
      setError("System encountered a calculation error.");
    }
  };

  useEffect(() => {
    if (results && isValidGrid(gunGrid) && isValidGrid(targetGrid)) {
      handleCalculate(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetGrid, isCorrectionMode, weaponSystem]);

  const handleCorrection = (type: 'ADD' | 'DROP' | 'LEFT' | 'RIGHT') => {
    setError(null);
    if (!isValidGrid(gunGrid) || !isValidGrid(targetGrid)) return;
    const newGrid = applyCorrection(gunGrid, targetGrid, { type, meters: correctionMeters });
    if (newGrid) {
      setTargetGrid(newGrid);
      addLog("FIRE ADJUSTMENT", `${type} ${correctionMeters}m → New Tgt: ${newGrid}`);
    }
  };

  const renderPlotter = () => {
    if (!results || !results.rawGun || !results.rawTarget) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-neutral-600">
          <Map className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm font-medium tracking-wider uppercase">Awaiting Telemetry</p>
        </div>
      );
    }

    const dE = results.rawTarget.easting - results.rawGun.easting;
    const dN = results.rawTarget.northing - results.rawGun.northing;
    const padding = results.range * 0.4;
    const maxBound = Math.max(Math.abs(dE), Math.abs(dN)) + padding;
    
    const viewBox = `${-maxBound} ${-maxBound} ${maxBound * 2} ${maxBound * 2}`;
    
    return (
      <div className="relative w-full h-full bg-neutral-950/50 rounded-2xl border border-neutral-800/80 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        <svg viewBox={viewBox} className="w-full h-full max-w-[90%] max-h-[90%] rotate-180 scale-x-[-1]">
          <line x1="0" y1={-maxBound} x2="0" y2={maxBound} stroke="rgba(255,255,255,0.1)" strokeWidth={maxBound*0.005} />
          <line x1={-maxBound} y1="0" x2={maxBound} y2="0" stroke="rgba(255,255,255,0.1)" strokeWidth={maxBound*0.005} />
          <circle cx="0" cy="0" r={results.range} fill="none" stroke="rgba(0,135,81,0.2)" strokeWidth={maxBound*0.01} strokeDasharray={`${maxBound*0.05} ${maxBound*0.05}`} />
          <line x1="0" y1="0" x2={dE} y2={dN} stroke="#008751" strokeWidth={maxBound*0.01} opacity="0.6" />
          <circle cx="0" cy="0" r={maxBound*0.04} fill="#008751" />
          <g transform={`translate(${dE}, ${dN})`}>
            <circle cx="0" cy="0" r={maxBound*0.05} fill="none" stroke="#ef4444" strokeWidth={maxBound*0.015} />
            <line x1={-maxBound*0.08} y1="0" x2={maxBound*0.08} y2="0" stroke="#ef4444" strokeWidth={maxBound*0.015} />
            <line x1="0" y1={-maxBound*0.08} x2="0" y2={maxBound*0.08} stroke="#ef4444" strokeWidth={maxBound*0.015} />
          </g>
        </svg>

        <div className="absolute bottom-4 right-4 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Active Tgt</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 font-sans selection:bg-[#008751]/30 pb-12">
      
      {/* Enterprise Header */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 flex items-center justify-center bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-[0_0_15px_rgba(0,135,81,0.15)]">
              <Image 
                src="/nigerian-army-logo.png" 
                alt="Military Logo" 
                fill 
                className="object-contain p-1"
                unoptimized
              />
              <div className="absolute inset-0 -z-10 flex items-center justify-center bg-neutral-900">
                <ShieldAlert className="w-5 h-5 text-[#008751]/40" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-sm font-bold tracking-widest text-white uppercase">
                Tactical <span className="text-[#008751]">| Auto-Plotter</span>
              </h1>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border transition-colors ${error ? 'border-rose-500/50' : 'border-neutral-800'}`}>
            <div className={`w-2 h-2 rounded-full transition-all ${error ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-[#008751] animate-pulse shadow-[0_0_8px_#008751]'}`}></div>
            <span className={`text-xs font-medium uppercase tracking-wider ${error ? 'text-rose-500' : 'text-neutral-300'}`}>
              {error ? 'System Error' : 'System Ready'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-6 mt-8 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Command & Control */}
        <section className="xl:col-span-4 space-y-6">
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 text-neutral-400">
              <Server className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Armament</span>
            </div>
            <select 
              className="bg-neutral-950 border border-neutral-700 text-sm text-white font-medium px-4 py-2 rounded-xl outline-none focus:border-[#008751] transition-all cursor-pointer"
              value={weaponSystem}
              onChange={(e) => setWeaponSystem(e.target.value)}
            >
              <option value="60mm_Light">60mm Light Mortar</option>
              <option value="81mm_Medium">81mm Medium Mortar</option>
              <option value="120mm_Heavy">120mm Heavy Mortar</option>
            </select>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#008751] to-transparent opacity-20"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Position Data
              </h2>
              {/* MASTER RESET BUTTON */}
              <button 
                onClick={handleReset} 
                className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">Mortar Line</label>
                <input
                  type="text"
                  value={gunGrid}
                  onChange={(e) => setGunGrid(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-2xl font-mono text-white placeholder-neutral-700 focus:outline-none focus:border-[#008751] focus:ring-1 focus:ring-[#008751] transition-all"
                />
              </div>

              <AnimatePresence mode="wait">
                {!isCorrectionMode ? (
                  <motion.div key="standard-input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">Target Grid</label>
                    <input
                      type="text"
                      value={targetGrid}
                      onChange={(e) => setTargetGrid(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-2xl font-mono text-white placeholder-neutral-700 focus:outline-none focus:border-[#008751] focus:ring-1 focus:ring-[#008751] transition-all"
                    />
                  </motion.div>
                ) : (
                  <motion.div key="correction-pad" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-[11px] font-semibold text-[#008751] uppercase tracking-wider flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" /> Adjust Target
                      </label>
                      <select 
                        className="bg-neutral-900 border border-neutral-700 text-xs text-white font-medium px-2 py-1.5 rounded-lg outline-none focus:border-[#008751]"
                        value={correctionMeters}
                        onChange={(e) => setCorrectionMeters(Number(e.target.value))}
                      >
                        <option value={10}>± 10 meters</option>
                        <option value={25}>± 25 meters</option>
                        <option value={50}>± 50 meters</option>
                        <option value={100}>± 100 meters</option>
                      </select>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <button onClick={() => handleCorrection('ADD')} className="w-24 h-12 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 hover:border-neutral-600 flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-95 group">
                        <Plus className="w-4 h-4 mr-1.5 group-hover:text-[#008751]" /> <span className="text-[11px] font-bold uppercase tracking-wider">Add</span>
                      </button>
                      <div className="flex gap-3 w-full justify-center items-center">
                        <button onClick={() => handleCorrection('LEFT')} className="w-24 h-14 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 hover:border-neutral-600 flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-95 group">
                          <ChevronLeft className="w-4 h-4 mr-1 group-hover:text-[#008751]" /> <span className="text-[11px] font-bold uppercase tracking-wider">Left</span>
                        </button>
                        <div className="w-32 h-16 bg-gradient-to-b from-[#008751]/10 to-transparent border border-[#008751]/30 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,135,81,0.1)]">
                          <span className="text-[9px] text-[#008751] uppercase tracking-widest font-semibold mb-0.5">Active</span>
                          <span className="font-mono font-medium text-xl text-white">{targetGrid}</span>
                        </div>
                        <button onClick={() => handleCorrection('RIGHT')} className="w-24 h-14 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 hover:border-neutral-600 flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-95 group">
                          <span className="text-[11px] font-bold uppercase tracking-wider mr-1">Right</span> <ChevronRight className="w-4 h-4 group-hover:text-[#008751]" />
                        </button>
                      </div>
                      <button onClick={() => handleCorrection('DROP')} className="w-24 h-12 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 hover:border-neutral-600 flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-95 group">
                        <Minus className="w-4 h-4 mr-1.5 group-hover:text-rose-500" /> <span className="text-[11px] font-bold uppercase tracking-wider">Drop</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleCalculate(false)}
              disabled={isCorrectionMode}
              className={`h-14 rounded-2xl text-[13px] font-semibold uppercase tracking-wider transition-all ${
                isCorrectionMode 
                ? "bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed" 
                : "bg-[#008751] hover:bg-[#007043] text-white shadow-[0_4px_14px_0_rgba(0,135,81,0.39)] hover:shadow-[0_6px_20px_rgba(0,135,81,0.23)] active:scale-95"
              }`}
            >
              Calculate
            </button>
            <button 
              onClick={() => setIsCorrectionMode(!isCorrectionMode)}
              className={`h-14 rounded-2xl text-[13px] font-semibold uppercase tracking-wider transition-all active:scale-95 border ${
                isCorrectionMode
                ? "bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600"
              }`}
            >
              {isCorrectionMode ? "Exit Correction" : "Correction"}
            </button>
          </div>
        </section>

        {/* Right Column: Telemetry & Tabbed Operations */}
        <section className="xl:col-span-8 space-y-6 flex flex-col">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col justify-center min-h-40 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-neutral-400"><Target className="w-24 h-24" /></div>
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 relative z-10">Calculated Range</div>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-6xl font-light tracking-tight text-white">{results ? results.range : "0.00"}</span>
                <span className="text-neutral-500 font-medium">meters</span>
              </div>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col justify-center min-h-40 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-neutral-400"><Crosshair className="w-24 h-24" /></div>
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 relative z-10">Calculated Bearing</div>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-6xl font-light tracking-tight text-white">{results ? results.bearing : "0.00"}</span>
                <span className="text-neutral-500 font-medium">mils</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl flex-1 flex flex-col min-h-96 shadow-sm overflow-hidden">
            <div className="border-b border-neutral-800/80 px-6 pt-6 flex justify-between items-end bg-neutral-900/50">
              <div className="flex gap-8">
                <button onClick={() => setActiveTab('DATA')} className={`pb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'DATA' ? 'text-white border-[#008751]' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}>
                  <Activity className="w-4 h-4" /> Solutions
                </button>
                <button onClick={() => setActiveTab('PLOTTER')} className={`pb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'PLOTTER' ? 'text-white border-[#008751]' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}>
                  <Map className="w-4 h-4" /> 2D Plotter
                </button>
                <button onClick={() => setActiveTab('LOG')} className={`pb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'LOG' ? 'text-white border-[#008751]' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}>
                  <History className="w-4 h-4" /> Mission Log
                  {missionLog.length > 0 && <span className="ml-1 bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full text-[10px]">{missionLog.length}</span>}
                </button>
              </div>
              
              {/* EXPORT BUTTON - Only visible when in the Log tab and log is not empty */}
              {activeTab === 'LOG' && missionLog.length > 0 && (
                <button 
                  onClick={handleExportLog}
                  className="pb-4 flex items-center gap-1.5 text-[10px] font-bold text-[#008751] uppercase tracking-widest hover:text-white transition-colors"
                >
                  <Download className="w-3 h-3" /> Export Report
                </button>
              )}
            </div>
            
            <div className="flex-1 p-6 relative bg-neutral-950/20">
              {activeTab === 'DATA' && (
                <div className="h-full animate-in fade-in duration-300">
                  {!results ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                      <Target className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium tracking-wider uppercase">Awaiting grid coordinates</p>
                    </div>
                  ) : !results.solutions ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                        <ShieldAlert className="w-8 h-8 text-rose-500" />
                      </div>
                      <span className="text-rose-500 font-semibold tracking-wide uppercase">Target Out of Range</span>
                      <span className="text-neutral-500 text-sm mt-1">Exceeds limits of {weaponSystem.replace('_', ' ')} table.</span>
                    </div>
                  ) : (
                    <div className="bg-neutral-950 rounded-2xl border border-neutral-800/50 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50 bg-neutral-900/50">
                          <tr>
                            <th className="py-4 pl-8">Trajectory Option</th>
                            <th className="py-4 text-right">Elevation (mils)</th>
                            <th className="py-4 text-right pr-8">Charge</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/30">
                          {results.solutions.map((sol, idx) => (
                            <tr key={idx} className="hover:bg-neutral-800/20 transition-colors">
                              <td className="py-5 pl-8 text-neutral-300 font-medium">{sol.type}</td>
                              <td className="py-5 text-right text-white font-mono text-[15px]">{sol.elevation}</td>
                              <td className="py-5 text-right pr-8 text-[#008751] font-bold font-mono text-[15px]">{sol.charge}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'PLOTTER' && (
                <div className="h-full animate-in fade-in duration-300">
                  {renderPlotter()}
                </div>
              )}

              {activeTab === 'LOG' && (
                <div className="h-full animate-in fade-in duration-300 overflow-y-auto pr-2">
                  {missionLog.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                      <History className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium tracking-wider uppercase">Log is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {missionLog.map((log, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800/50">
                          <div className="text-[10px] text-neutral-500 font-mono font-medium pt-1 shrink-0">{log.time}</div>
                          <div>
                            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${log.action === 'TARGET ACQUIRED' ? 'text-[#008751]' : 'text-amber-500'}`}>
                              {log.action}
                            </div>
                            <div className="text-sm text-neutral-300 font-mono">{log.details}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}