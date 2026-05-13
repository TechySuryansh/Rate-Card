"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  BarChart3, 
  Mail, 
  Eye, 
  ArrowRight,
  Loader2,
  Clock,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Globe,
  Settings,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Constants ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

// --- Types ---
type StageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';

interface Stage {
  id: number;
  name: string;
  description: string;
  status: StageStatus;
  result?: any;
}

// --- Mock Data ---
const INITIAL_STAGES: Stage[] = [
  { id: 1, name: 'PDF Extraction', description: 'AI parsing and structuring of raw PDF data', status: 'pending' },
  { id: 2, name: 'Data Validation', description: 'Business rule checks and auto-corrections', status: 'pending' },
  { id: 3, name: 'Template Mapping', description: 'Conversion to RateCube template format', status: 'pending' },
  { id: 4, name: 'Impact Analysis', description: 'Financial comparison vs current rates', status: 'pending' },
  { id: 5, name: 'Client Communication', description: 'Professional approval request generation', status: 'pending' },
  { id: 6, name: 'Approval Monitoring', description: 'Response classification and routing', status: 'pending' },
  { id: 7, name: 'Revision Loop', description: 'Carrier feedback and revision handling', status: 'pending' },
  { id: 8, name: 'Final Activation', description: 'Production deployment to RateCube', status: 'pending' },
];

export default function Dashboard() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [fullResults, setFullResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState({
    provider: 'Groq',
    mockMode: true,
    threshold: 0.85
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      startWorkflow(files[0]);
    } else {
      alert('Please upload a valid PDF rate card.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      startWorkflow(files[0]);
    }
  };

  // Real Workflow Integration
  const startWorkflow = async (file?: File) => {
    setIsUploading(true);
    setStages(prev => {
      const next = [...INITIAL_STAGES];
      next[0].status = 'processing';
      return next;
    });
    setWorkflowStarted(true);
    setCurrentStep(0);
    setIsApproved(false);
    setAnalysisData(null);
    
    if (!file) {
      // Simulation fallback
      runMockSimulation();
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientName', 'Acme Logistics');
      formData.append('carrierName', 'Global Freight Corp');

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setWorkflowId(result.workflowId);
      setFullResults(result);
      setIsUploading(false);
      setTimeout(() => animateRealResults(result), 200);
    } catch (error: any) {
      console.error('API Error:', error);
      alert(`API Error: ${error.message}`);
      setIsUploading(false);
      setWorkflowStarted(false);
    }
  };
  
  const downloadStructuredPdf = async () => {
    if (!workflowId) return;
    
    // Create a temporary loading state for the button if needed
    console.log('📂 Requesting structured PDF...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/${workflowId}`);
      
      if (response.status === 202) {
        // Still processing - wait and retry
        alert('AI is still finalizing the structure. I will retry in 5 seconds...');
        setTimeout(downloadStructuredPdf, 5000);
        return;
      }

      if (response.ok) {
        window.open(`${API_BASE_URL}/api/export/${workflowId}`, '_blank');
      } else {
        const err = await response.json();
        alert(`Export failed: ${err.error}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct open if fetch fails
      window.open(`${API_BASE_URL}/api/export/${workflowId}`, '_blank');
    }
  };

  const runMockSimulation = () => {
    let current = 0;
    const next = () => {
      if (current >= 4) {
        setIsUploading(false);
        return;
      }
      setStages(prev => {
        const next = [...prev];
        next[current].status = 'completed';
        if (current === 0) next[0].result = { rows: 15, confidence: 0.98 };
        if (current === 3) {
          setAnalysisData({
            revenue: '+$1.05M',
            change: '+10.7%',
            lanes: 15,
            risk: 'Low'
          });
        }
        return next;
      });
      current++;
      setTimeout(next, 1500);
    };
    next();
  };

  const animateRealResults = (data: any) => {
    let currentIdx = 0;
    const next = () => {
      if (currentIdx >= 8) return;
      
      const idxToUpdate = currentIdx; // Capture stable index for the closure
      setStages(prev => {
        const updated = [...prev];
        updated[idxToUpdate].status = 'completed';
        
        if (idxToUpdate === 0) {
          updated[0].result = { 
            rows: data.extractionMetadata?.total_rows || 0, 
            confidence: data.fullState?.stage_results?.stage_1?.confidence_score || 0.95 
          };
        }
        if (idxToUpdate === 3) {
          setAnalysisData({
            revenue: data.impactAnalysis?.net_revenue_impact || 'N/A',
            change: data.impactAnalysis?.net_price_change_percent || 'N/A',
            lanes: data.extractionMetadata?.total_rows || 0,
            risk: (data.fullState?.stage_results?.stage_4?.high_risk_changes?.length || 0) > 0 ? 'High' : 'Low'
          });
        }
        if (idxToUpdate < 7) {
          updated[idxToUpdate + 1].status = 'processing';
        }
        return updated;
      });
      
      currentIdx++;
      if (currentIdx < 5) setTimeout(next, 1000);
    };
    next();
  };

  const handleApprove = () => {
    setIsApprovalModalOpen(false);
    setIsApproved(true);
    // Complete Stage 6 and 8
    setStages(prev => {
      const next = [...prev];
      next[5].status = 'completed';
      return next;
    });
    setTimeout(() => {
      setStages(prev => {
        const next = [...prev];
        next[7].status = 'completed';
        return next;
      });
    }, 2000);
  };

  const handleRequestRevision = () => {
    setIsApprovalModalOpen(false);
    setStages(prev => {
      const next = [...prev];
      next[5].status = 'processing';
      return next;
    });

    setTimeout(() => {
      setStages(prev => {
        const next = [...prev];
        next[5].status = 'completed';
        next[6].status = 'processing';
        return next;
      });

      setTimeout(() => {
        setStages(prev => {
          const next = [...prev];
          next[6].status = 'completed';
          next[4].status = 'processing';
          return next;
        });
        
        setTimeout(() => {
          setStages(prev => {
            const next = [...prev];
            next[4].status = 'completed';
            return next;
          });
        }, 2000);
      }, 4000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12 relative">
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-md w-full rounded-3xl p-8 shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Workflow Settings
                </h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm text-zinc-400 font-medium">LLM Intelligence Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Groq', 'Claude', 'OpenAI', 'Gemini'].map(p => (
                      <button 
                        key={p}
                        onClick={() => setConfig({...config, provider: p})}
                        className={`py-2 px-4 rounded-xl text-sm font-medium border transition-all ${
                          config.provider === p ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">Mock Mode</p>
                    <p className="text-xs text-zinc-500">Simulate API responses for demo</p>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, mockMode: !config.mockMode})}
                    className={`w-12 h-6 rounded-full relative transition-colors ${config.mockMode ? 'bg-blue-600' : 'bg-zinc-700'}`}
                  >
                    <motion.div 
                      animate={{ x: config.mockMode ? 26 : 4 }}
                      className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-zinc-400 font-medium">Extraction Threshold</label>
                    <span className="text-blue-500 font-mono">{Math.round(config.threshold * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="0.99" 
                    step="0.01" 
                    value={config.threshold}
                    onChange={(e) => setConfig({...config, threshold: parseFloat(e.target.value)})}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-all"
              >
                Save Configuration
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Stage Details Inspector */}
      <AnimatePresence>
        {selectedStage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-3xl glass rounded-[2.5rem] overflow-hidden border border-zinc-700 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    {selectedStage.id === 1 && <FileText className="w-6 h-6 text-blue-400" />}
                    {selectedStage.id === 2 && <ShieldCheck className="w-6 h-6 text-green-400" />}
                    {selectedStage.id === 3 && <Globe className="w-6 h-6 text-purple-400" />}
                    {selectedStage.id === 4 && <BarChart3 className="w-6 h-6 text-yellow-400" />}
                    {selectedStage.id === 5 && <Mail className="w-6 h-6 text-pink-400" />}
                    {selectedStage.id >= 6 && <Activity className="w-6 h-6 text-blue-400" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedStage.name}</h3>
                    <p className="text-zinc-400">{selectedStage.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStage(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <AlertCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Dynamic Content Based on Stage */}
                {selectedStage.id === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                        <span className="text-zinc-500 text-sm block mb-1">Extraction Confidence</span>
                        <span className="text-3xl font-bold text-blue-500">
                          {Math.round((fullResults?.fullState?.stage_results?.stage_1?.confidence_score || 0.96) * 100)}%
                        </span>
                      </div>
                      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                        <span className="text-zinc-500 text-sm block mb-1">Total Lanes Found</span>
                        <span className="text-3xl font-bold">
                          {fullResults?.extractionMetadata?.total_rows || 0}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-zinc-400" />
                        Raw Extractions (Sample)
                      </h4>
                      <div className="space-y-3 opacity-80">
                        {fullResults?.fullState?.stage_results?.stage_1?.extracted_data?.rows?.slice(0, 3).map((item: any, i: number) => (
                          <div key={i} className="text-sm p-3 bg-black/20 rounded-lg font-mono truncate">
                            {JSON.stringify(item)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedStage.id === 3 && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                      <h4 className="font-semibold mb-4">Structured Lane Mapping</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800">
                              <th className="pb-3 pr-4">Origin</th>
                              <th className="pb-3 pr-4">Destination</th>
                              <th className="pb-3 pr-4">Rate</th>
                              <th className="pb-3">Currency</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                            {fullResults?.fullState?.stage_results?.stage_3?.transformed_data?.slice(0, 5).map((lane: any, i: number) => (
                              <tr key={i}>
                                <td className="py-3 pr-4 font-medium">{lane.template_fields.origin}</td>
                                <td className="py-3 pr-4">{lane.template_fields.destination}</td>
                                <td className="py-3 pr-4 text-blue-400">${lane.template_fields.rate}</td>
                                <td className="py-3">{lane.template_fields.currency}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {selectedStage.id === 4 && (
                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-blue-600/10 border border-blue-500/20 text-center">
                      <BarChart3 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <h4 className="text-xl font-bold mb-2">Net Revenue Impact</h4>
                      <span className="text-4xl font-black text-blue-400">
                        {fullResults?.impactAnalysis?.net_revenue_impact || 'N/A'}
                      </span>
                    </div>
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                      <h4 className="font-semibold mb-4">Top 3 Lane Changes</h4>
                      <div className="space-y-4">
                        {fullResults?.fullState?.stage_results?.stage_4?.comparison_summary?.significant_changes?.slice(0, 3).map((change: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                            <span className="text-sm">{change.lane}</span>
                            <span className={`text-sm font-bold ${change.diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {change.diff > 0 ? '+' : ''}{change.diff}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedStage.id === 5 && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 font-serif leading-relaxed text-zinc-300 whitespace-pre-wrap">
                      {fullResults?.fullState?.stage_results?.stage_5?.email_body || 'Generating communication draft...'}
                    </div>
                  </div>
                )}

                {!fullResults && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p>Processing required before analysis is available</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                <button 
                  onClick={() => setSelectedStage(null)}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition-colors"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approval Modal */}
      <AnimatePresence>
        {isApprovalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-2xl w-full rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">Review Approval Request</h2>
                  <p className="text-zinc-400">Review the generated communication and impact analysis before proceeding.</p>
                </div>
                <button onClick={() => setIsApprovalModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Subject</p>
                    <p className="text-sm font-medium italic">"Request for Approval: New Rate Card for Global Freight Corp"</p>
                  </div>
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed">
                  Dear John Smith, we are pleased to present the new rate card for Global Freight Corp, effective June 12, 2026. 
                  The updated rate card introduces <span className="text-blue-400">12 new lanes</span> and a price increase of 10.71% on existing lanes. 
                  This change is expected to result in a net revenue impact of <span className="text-green-400">+$1.05M per month</span>.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        console.log('🔄 Resetting Dashboard...');
                        setWorkflowStarted(false);
                        setStages(INITIAL_STAGES);
                        setWorkflowId(null);
                        setIsApproved(false);
                        setFullResults(null);
                        setAnalysisData(null);
                        setSelectedStage(null);
                        setCurrentStep(0);
                        setIsUploading(false);
                        console.log('✅ Dashboard Reset Complete');
                      }}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded-lg transition-colors border border-zinc-700"
                    >
                      Process Another PDF
                    </button>
                    <button 
                      disabled={stages[3].status !== 'completed'}
                      onClick={downloadStructuredPdf}
                      className={`flex-1 font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                        stages[3].status === 'completed' 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      {stages[3].status === 'completed' ? 'Download Structured PDF' : 'Processing...'}
                    </button>
                  </div>
                <button 
                  onClick={handleApprove}
                  className="py-3 rounded-xl bg-green-600 hover:bg-green-700 font-semibold transition-colors shadow-lg shadow-green-900/20"
                >
                  Approve & Activate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold gradient-text">RateCard Agentic AI</h1>
          <p className="text-zinc-400 mt-1">Autonomous rate card lifecycle management</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-full glass glass-hover"
          >
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
            S
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {!workflowStarted ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`glass p-12 rounded-3xl border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4 transition-all cursor-pointer group ${
                isDragging ? 'border-blue-500 bg-blue-500/5 scale-[1.02]' : 'border-zinc-800 hover:border-blue-500/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf" className="hidden" />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-lg font-medium">Analyzing PDF structure...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Upload className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Upload Rate Card PDF</h3>
                    <p className="text-zinc-400 max-w-xs mt-2">Drag and drop your carrier rate card to start the autonomous extraction pipeline.</p>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-blue-500" />
                Active Processing Pipeline
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stages.map((stage, idx) => (
                  <motion.div 
                    key={stage.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => stage.status !== 'pending' && setSelectedStage(stage)}
                    className={`glass p-5 rounded-2xl relative overflow-hidden transition-all duration-500 cursor-pointer hover:border-blue-500/50 ${
                      stage.status === 'processing' ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10' : ''
                    } ${stage.status === 'completed' ? 'opacity-100' : 'opacity-40'}`}
                  >
                    {stage.status === 'completed' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />}
                    {stage.status === 'processing' && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 animate-pulse" />}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Stage {stage.id}</span>
                          {stage.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        </div>
                        <h4 className="font-semibold text-lg">{stage.name}</h4>
                        <p className="text-sm text-zinc-400">{stage.description}</p>
                      </div>
                      <div className="flex items-center">
                        {stage.status === 'processing' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                        {stage.status === 'pending' && <Clock className="w-5 h-5 text-zinc-700" />}
                      </div>
                    </div>
                    {stage.result && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex gap-4">
                        <div className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">{stage.result.rows} lanes</div>
                        <div className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">{Math.round(stage.result.confidence * 100)}% confidence</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-6 rounded-3xl space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Impact Summary
            </h3>
            {analysisData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/50">
                    <p className="text-zinc-500 text-xs uppercase font-semibold">Rev Impact</p>
                    <p className="text-2xl font-bold text-green-500">{analysisData.revenue}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/50">
                    <p className="text-zinc-500 text-xs uppercase font-semibold">Price Δ</p>
                    <p className="text-2xl font-bold text-blue-500">{analysisData.change}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Validated Lanes</span>
                    <span className="font-mono">{analysisData.lanes}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Risk Profile</span>
                    <span className="text-green-500 font-medium px-2 py-0.5 rounded bg-green-500/10 uppercase text-[10px] tracking-wider">{analysisData.risk}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <button 
                    disabled={isApproved || stages[4].status !== 'completed'}
                    onClick={() => setIsApprovalModalOpen(true)}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group ${
                      isApproved ? 'bg-green-600/20 text-green-500 cursor-default' : stages[4].status === 'completed' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {isApproved ? <><CheckCircle2 className="w-4 h-4" />Approved</> : <>Review Approval Request <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3 grayscale opacity-30">
                <Globe className="w-12 h-12 text-zinc-500" />
                <p className="text-sm">Processing required before analysis is available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
