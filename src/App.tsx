import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, Environment, Grid, ContactShadows } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box, Circle, Triangle, Cone, Move, RotateCcw, Maximize, Download, Upload, Palette, Trash2, Glasses, Layers } from 'lucide-react';

const store = createXRStore();

type ShapeType = 'cuboid' | 'sphere' | 'prism' | 'pyramid';
type TransformMode = 'translate' | 'rotate' | 'scale';

interface SceneObject {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

interface ImportedModel {
  id: string;
  scene: THREE.Group;
}

export default function App() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [importedModels, setImportedModels] = useState<ImportedModel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const exportGroupRef = useRef<THREE.Group>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addObject = (type: ShapeType) => {
    const newObj: SceneObject = {
      id: Date.now().toString(),
      type,
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#4285F4'
    };
    setObjects([...objects, newObj]);
    setSelectedId(newObj.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setObjects(objects.filter(o => o.id !== selectedId));
    setImportedModels(importedModels.filter(m => m.id !== selectedId));
    setSelectedId(null);
  };

  const updateSelectedColor = (color: string) => {
    setObjects(objects.map(o => o.id === selectedId ? { ...o, color } : o));
  };

  const handleExport = () => {
    if (!exportGroupRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      exportGroupRef.current,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'scene.glb';
        link.click();
        URL.revokeObjectURL(url);
      },
      (error) => console.error('Export failed:', error),
      { binary: true }
    );
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = event.target?.result;
      if (contents) {
        const loader = new GLTFLoader();
        loader.parse(contents as ArrayBuffer, '', (gltf) => {
          const newId = Date.now().toString();
          gltf.scene.name = newId;
          setImportedModels(prev => [...prev, { id: newId, scene: gltf.scene }]);
          setSelectedId(newId);
        });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedObject = objects.find(o => o.id === selectedId);
  const isImportedSelected = importedModels.some(m => m.id === selectedId);

  return (
    <div className="w-screen h-screen bg-zinc-950 text-white overflow-hidden flex flex-col font-sans">
      {/* Top Bar */}
      <header className="h-16 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Box className="w-5 h-5 text-zinc-950" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Immersive 3D Editor</h1>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".glb,.gltf" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" /> Import GLB
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Export GLB
          </button>
          <button onClick={() => store.enterAR().catch(err => setErrorMsg("AR is not supported on this device. " + err.message))} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-colors">
            <Glasses className="w-4 h-4" /> Enter AR
          </button>
          <button onClick={() => store.enterVR().catch(err => setErrorMsg("VR is not supported on this device. " + err.message))} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors">
            <Glasses className="w-4 h-4" /> Enter VR
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 backdrop-blur-md border border-red-400/50">
          <span className="text-sm font-medium">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 relative">
        {/* Left Toolbar - Transform Modes */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-zinc-900/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 z-10">
          <button onClick={() => setTransformMode('translate')} className={`p-3 rounded-xl transition-colors ${transformMode === 'translate' ? 'bg-emerald-500 text-zinc-950' : 'hover:bg-white/10 text-zinc-400'}`} title="Translate">
            <Move className="w-5 h-5" />
          </button>
          <button onClick={() => setTransformMode('rotate')} className={`p-3 rounded-xl transition-colors ${transformMode === 'rotate' ? 'bg-emerald-500 text-zinc-950' : 'hover:bg-white/10 text-zinc-400'}`} title="Rotate">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={() => setTransformMode('scale')} className={`p-3 rounded-xl transition-colors ${transformMode === 'scale' ? 'bg-emerald-500 text-zinc-950' : 'hover:bg-white/10 text-zinc-400'}`} title="Scale">
            <Maximize className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Toolbar - Add Shapes */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 z-10">
          <button onClick={() => addObject('cuboid')} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">
            <Box className="w-4 h-4 text-blue-400" /> Cuboid
          </button>
          <button onClick={() => addObject('sphere')} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">
            <Circle className="w-4 h-4 text-red-400" /> Sphere
          </button>
          <button onClick={() => addObject('prism')} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">
            <Triangle className="w-4 h-4 text-green-400" /> Prism
          </button>
          <button onClick={() => addObject('pyramid')} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">
            <Cone className="w-4 h-4 text-yellow-400" /> Pyramid
          </button>
        </div>

        {/* Right Panel - Scene Graph & Properties */}
        <div className="absolute right-6 top-6 w-64 max-h-[calc(100vh-8rem)] flex flex-col bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-5 z-10 shadow-2xl overflow-y-auto custom-scrollbar">
          
          {/* Scene Graph */}
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Scene Objects
            </h3>
            
            <div className="space-y-2">
              {objects.length === 0 && importedModels.length === 0 && (
                <p className="text-xs text-zinc-500 italic">Scene is empty</p>
              )}
              
              {objects.map((obj, index) => (
                <button
                  key={obj.id}
                  onClick={() => setSelectedId(obj.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border ${selectedId === obj.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'hover:bg-white/5 text-zinc-300 border-transparent'}`}
                >
                  {obj.type === 'cuboid' && <Box className="w-4 h-4" />}
                  {obj.type === 'sphere' && <Circle className="w-4 h-4" />}
                  {obj.type === 'prism' && <Triangle className="w-4 h-4" />}
                  {obj.type === 'pyramid' && <Cone className="w-4 h-4" />}
                  <span className="capitalize truncate">{obj.type} {index + 1}</span>
                </button>
              ))}

              {importedModels.map((model, index) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedId(model.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border ${selectedId === model.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'hover:bg-white/5 text-zinc-300 border-transparent'}`}
                >
                  <Box className="w-4 h-4" />
                  <span className="truncate">Imported Model {index + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Properties */}
          {selectedId && (
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Properties</h3>
              
              {selectedObject && (
                <div className="space-y-3 mb-6">
                  <label className="text-xs text-zinc-400 flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8E24AA', '#F4511E', '#3949AB', '#FFFFFF', '#9E9E9E', '#212121'].map(c => (
                      <button 
                        key={c}
                        onClick={() => updateSelectedColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedObject.color === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input 
                    type="color" 
                    value={selectedObject.color}
                    onChange={(e) => updateSelectedColor(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-white/10 mt-2"
                  />
                </div>
              )}

              {isImportedSelected && (
                <div className="mb-6 text-sm text-zinc-400 italic">
                  Imported 3D Model selected. Transform tools are available.
                </div>
              )}

              <button 
                onClick={deleteSelected}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-sm font-bold"
              >
                <Trash2 className="w-4 h-4" /> Delete Object
              </button>
            </div>
          )}
        </div>

        {/* 3D Canvas */}
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }} onPointerMissed={() => setSelectedId(null)}>
          <XR store={store}>
            <color attach="background" args={['#18181b']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <Environment preset="city" />
            
            <Grid infiniteGrid fadeDistance={50} sectionColor="#3f3f46" cellColor="#27272a" />
            <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={20} blur={2} far={10} />

            <group ref={exportGroupRef}>
              {objects.map((obj) => (
                <mesh
                  key={obj.id}
                  name={obj.id}
                  position={obj.position}
                  rotation={obj.rotation}
                  scale={obj.scale}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(obj.id); }}
                  castShadow
                  receiveShadow
                >
                  {obj.type === 'cuboid' && <boxGeometry args={[1, 1, 1]} />}
                  {obj.type === 'sphere' && <sphereGeometry args={[0.6, 32, 32]} />}
                  {obj.type === 'prism' && <cylinderGeometry args={[0.6, 0.6, 1, 3]} />}
                  {obj.type === 'pyramid' && <cylinderGeometry args={[0, 0.7, 1, 4]} />}
                  <meshStandardMaterial color={obj.color} roughness={0.2} metalness={0.1} />
                </mesh>
              ))}

              {importedModels.map((model) => (
                <primitive 
                  key={model.id} 
                  object={model.scene} 
                  name={model.id}
                  onClick={(e: any) => { e.stopPropagation(); setSelectedId(model.id); }}
                />
              ))}
            </group>

            {selectedId && exportGroupRef.current?.getObjectByName(selectedId) && (
              <TransformControls
                object={exportGroupRef.current.getObjectByName(selectedId)}
                mode={transformMode}
                onMouseUp={(e) => {
                  const obj = exportGroupRef.current?.getObjectByName(selectedId);
                  if (obj) {
                    setObjects(prev => prev.map(o => {
                      if (o.id === selectedId) {
                        return {
                          ...o,
                          position: [obj.position.x, obj.position.y, obj.position.z],
                          rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                          scale: [obj.scale.x, obj.scale.y, obj.scale.z]
                        };
                      }
                      return o;
                    }));
                  }
                }}
              />
            )}

            <OrbitControls makeDefault />
          </XR>
        </Canvas>
      </div>
    </div>
  );
}
