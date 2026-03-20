import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { ModelMetadata, InteractionLogic } from '../../types/xr';
import { Plus, Trash2, Edit3, Upload, Box, Settings, Activity, Layers, X, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', description: '', category: '' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/');
      }
    });

    const q = query(collection(db, 'models'));
    const unsubModels = onSnapshot(q, (snapshot) => {
      setModels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModelMetadata)));
    });

    return () => {
      unsubscribeAuth();
      unsubModels();
    };
  }, [navigate]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append("file", file);

      // We simulate progress since fetch doesn't have native upload progress easily
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload to our local Express backend
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to upload file");
      }

      const data = await response.json();
      const url = data.url;

      // Save metadata to Firestore
      await addDoc(collection(db, 'models'), {
        ...newModel,
        storagePath: url,
        createdAt: new Date().toISOString(),
      });

      setShowUpload(false);
      setNewModel({ name: '', description: '', category: '' });
      setFile(null);
      setUploadProgress(0);
    } catch (err: any) {
      console.error("Upload failed", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-zinc-400 mt-1">Manage your 3D assets and interaction logic.</p>
        </div>
        <button 
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          Upload New Model
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-500" />
                3D Models Library
              </h2>
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">{models.length} Models</span>
            </div>
            <div className="divide-y divide-white/5">
              {models.map((model) => (
                <div key={model.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5">
                      <Box className="w-8 h-8 text-zinc-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{model.name}</h3>
                      <p className="text-sm text-zinc-400 line-clamp-1">{model.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {model.category || 'Uncategorized'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteDoc(doc(db, 'models', model.id))}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {models.length === 0 && (
                <div className="p-12 text-center text-zinc-500 italic">
                  No models uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <h2 className="font-bold flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-500" />
              Quick Stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                <span className="text-xs text-zinc-500 block">Total Models</span>
                <span className="text-2xl font-bold">{models.length}</span>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                <span className="text-xs text-zinc-500 block">Interactions</span>
                <span className="text-2xl font-bold">0</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <h2 className="font-bold flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-emerald-500" />
              Environment Settings
            </h2>
            <button className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 transition-colors text-sm font-medium">
              Configure Scene Environment
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpload(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Upload 3D Model</h2>
                <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpload} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Model Name</label>
                    <input 
                      required
                      value={newModel.name}
                      onChange={e => setNewModel({...newModel, name: e.target.value})}
                      className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      placeholder="e.g. Industrial Turbine"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Description</label>
                    <textarea 
                      value={newModel.description}
                      onChange={e => setNewModel({...newModel, description: e.target.value})}
                      className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors h-24 resize-none"
                      placeholder="Describe the model and its components..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Category</label>
                      <select 
                        value={newModel.category}
                        onChange={e => setNewModel({...newModel, category: e.target.value})}
                        className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      >
                        <option value="">Select Category</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Medical">Medical</option>
                        <option value="Architecture">Architecture</option>
                        <option value="Education">Education</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">GLB File</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept=".glb,.gltf"
                          onChange={e => setFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                          <span className="truncate opacity-50">{file ? file.name : 'Choose file...'}</span>
                          <Upload className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  disabled={uploading}
                  className="relative w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 overflow-hidden"
                >
                  {uploading && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-emerald-400/30 transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }} 
                    />
                  )}
                  <div className="relative flex items-center gap-2">
                    {uploading ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        Uploading... {Math.round(uploadProgress)}%
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Model
                      </>
                    )}
                  </div>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
