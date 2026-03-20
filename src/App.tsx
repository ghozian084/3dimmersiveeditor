import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Environment, Grid, ContactShadows } from '@react-three/drei';
import { XR, createXRStore, useXR, useXRHitTest } from '@react-three/xr';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box, Circle, Triangle, Cone, Move, RotateCcw, Maximize, Download, Upload, Palette, Trash2, Glasses, Layers } from 'lucide-react';

const store = createXRStore({
  domOverlay: document.getElementById('root') as HTMLElement
});

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

function Reticle({ onUpdatePosition }: { onUpdatePosition: (pos: THREE.Vector3) => void }) {
  const reticleRef = useRef<THREE.Group>(null);
  const isAR = useXR((state) => state.mode === 'immersive-ar');

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (!reticleRef.current || !isAR) return;
      if (results.length > 0) {
        reticleRef.current.visible = true;
        const matrix = new THREE.Matrix4();
        getWorldMatrix(matrix, results[0]);
        matrix.decompose(
          reticleRef.current.position,
          reticleRef.current.quaternion,
          reticleRef.current.scale
        );
        onUpdatePosition(reticleRef.current.position);
      } else {
        reticleRef.current.visible = false;
      }
    },
    'viewer'
  );

  if (!isAR) return null;

  return (
    <group ref={reticleRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.15, 32]} />
        <meshBasicMaterial color="#4285F4" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function EnvironmentElements() {
  const isAR = useXR((state) => state.mode === 'immersive-ar');
  if (isAR) return null;
  return (
    <>
      <Grid infiniteGrid fadeDistance={50} sectionColor="#3f3f46" cellColor="#27272a" />
      <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={20} blur={2} far={10} />
    </>
  );
}

function SceneBackground() {
  const isAR = useXR((state) => state.mode === 'immersive-ar');
  const { scene } = useThree();

  useEffect(() => {
    if (isAR) {
      scene.background = null;
    } else {
      scene.background = new THREE.Color('#18181b');
    }
  }, [isAR, scene]);

  return null;
}

export default function App() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [importedModels, setImportedModels] = useState<ImportedModel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSceneGraphOpen, setIsSceneGraphOpen] = useState(false);
  
  const exportGroupRef = useRef<THREE.Group>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reticlePosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));

  const addObject = (type: ShapeType) => {
    const isAR = store.getState().mode === 'immersive-ar';
    const position: [number, number, number] = isAR 
      ? [reticlePosRef.current.x, reticlePosRef.current.y + 0.5, reticlePosRef.current.z]
      : [0, 0.5, 0];

    const newObj: SceneObject = {
      id: Date.now().toString(),
      type,
      position,
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
    <div className="w-screen h-screen text-white overflow-hidden flex flex-col font-sans bg-transparent">
      {/* Top Bar */}
      <header className="h-14 sm:h-16 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 z-20 relative">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Box className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-950" />
          </div>
          <h1 className="font-bold text-sm sm:text-lg tracking-tight truncate">3D Editor</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <input 
            type="file" 
            accept=".glb,.gltf" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors" title="Import GLB">
            <Upload className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
          <button onClick={handleExport} className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors" title="Export GLB">
            <Download className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
          <button onClick={() => store.enterAR().catch(err => setErrorMsg("AR is not supported on this device. " + err.message))} className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-colors">
            <Glasses className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Enter AR</span><span className="sm:hidden">AR</span>
          </button>
          <button onClick={() => setIsSceneGraphOpen(!isSceneGraphOpen)} className="md:hidden p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors" title="Toggle Menu">
            <Layers className="w-4 h-4" />
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
        <div className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1 sm:gap-2 bg-zinc-900/80 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-white/10 z-10">
          <button onClick={() => setTransformMode('translate')} className={`p-2 sm:p-3 rounded-xl transition-colors ${transformMode === 'translate' ? 'bg-emerald-500 text-zinc-950' : 'hover:bg-white/10 text-zinc-400'}`} title="Translate">
            <Move className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => setTransformMode('rotate')} className={`p-2 sm:p-3 rounded-xl transition-colors ${transformMode === 'rotate' ? 'bg-emerald-500 text-zinc-950' : 'hover:bg-white/10 text-zinc-400'}`} title="Rotate">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => setTransformMode('scale')} className={`p-2 sm:p-3 rounded-xl transition-colors ${transformMode === 'scale' ? 'bg-emerald-500 text-zinc-950' : 'hover:bg-white/10 text-zinc-400'}`} title="Scale">
            <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Bottom Toolbar - Add Shapes */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 bg-zinc-900/80 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-white/10 z-10 w-[90%] sm:w-auto overflow-x-auto custom-scrollbar">
          <button onClick={() => addObject('cuboid')} className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium flex-1 sm:flex-none min-w-[3rem]">
            <Box className="w-5 h-5 sm:w-4 sm:h-4 text-blue-400" /> <span className="hidden sm:inline">Cuboid</span>
          </button>
          <button onClick={() => addObject('sphere')} className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium flex-1 sm:flex-none min-w-[3rem]">
            <Circle className="w-5 h-5 sm:w-4 sm:h-4 text-red-400" /> <span className="hidden sm:inline">Sphere</span>
          </button>
          <button onClick={() => addObject('prism')} className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium flex-1 sm:flex-none min-w-[3rem]">
            <Triangle className="w-5 h-5 sm:w-4 sm:h-4 text-green-400" /> <span className="hidden sm:inline">Prism</span>
          </button>
          <button onClick={() => addObject('pyramid')} className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium flex-1 sm:flex-none min-w-[3rem]">
            <Cone className="w-5 h-5 sm:w-4 sm:h-4 text-yellow-400" /> <span className="hidden sm:inline">Pyramid</span>
          </button>
        </div>

        {/* Right Panel - Scene Graph & Properties */}
        <div className={`absolute right-2 sm:right-6 top-16 sm:top-6 w-56 sm:w-64 max-h-[calc(100vh-8rem)] flex flex-col bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 z-20 shadow-2xl overflow-y-auto custom-scrollbar transition-transform duration-300 ${isSceneGraphOpen ? 'translate-x-0' : 'translate-x-[150%] md:translate-x-0'}`}>
          
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
            <SceneBackground />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <Environment preset="city" />
            
            <EnvironmentElements />

            <Reticle onUpdatePosition={(pos) => reticlePosRef.current.copy(pos)} />

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
