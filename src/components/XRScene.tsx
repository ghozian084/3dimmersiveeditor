import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { OrbitControls, Environment, ContactShadows, useGLTF, Html, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ModelMetadata, InteractionLogic } from '../types/xr';
import { Loader2, Maximize2, RotateCw, Info, Box, Smartphone } from 'lucide-react';

const store = createXRStore({
  hand: {
    // Hand options
  },
  controller: {
    // Controller options
  },
});

// Component to load and display a 3D model with interactions
function ModelInstance({ model, interactions }: { model: ModelMetadata, interactions: InteractionLogic[] }) {
  const { scene, animations } = useGLTF(model.storagePath);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const mixer = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(scene);
      const action = mixer.current.clipAction(animations[0]);
      action.play();
    }
    return () => {
      mixer.current?.stopAllAction();
    };
  }, [animations, scene]);

  useFrame((state, delta) => {
    mixer.current?.update(delta);
  });

  const handleInteraction = useCallback((type: string) => {
    const relevantInteractions = interactions.filter(i => i.trigger === type);
    relevantInteractions.forEach(interaction => {
      interaction.actions.forEach(action => {
        switch (action.type) {
          case 'change_color':
            scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: action.value });
              }
            });
            break;
          case 'play_animation':
            // Logic to play specific animation
            break;
          case 'show_text':
            // Logic to trigger UI popup
            break;
        }
      });
    });
  }, [interactions, scene]);

  return (
    <group
      onPointerOver={() => {
        setHovered(true);
        handleInteraction('hover');
      }}
      onPointerOut={() => setHovered(false)}
      onClick={() => {
        setSelected(!selected);
        handleInteraction('tap');
      }}
    >
      <primitive 
        object={scene} 
        scale={hovered ? 1.05 : 1} 
      />
      {selected && (
        <Html distanceFactor={10} position={[0, 2, 0]}>
          <div className="bg-zinc-900/90 backdrop-blur-md border border-emerald-500/50 p-3 rounded-xl shadow-2xl text-white min-w-[200px] pointer-events-auto">
            <h3 className="text-sm font-bold text-emerald-400">{model.name}</h3>
            <p className="text-xs opacity-70 mt-1">{model.description}</p>
            <div className="flex gap-2 mt-3">
              <button className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function XRScene() {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [interactions, setInteractions] = useState<InteractionLogic[]>([]);
  const [loading, setLoading] = useState(true);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [vrSupported, setVrSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if ('xr' in navigator) {
      const xr = (navigator as any).xr;
      xr.isSessionSupported('immersive-ar').then((supported: boolean) => setArSupported(supported));
      xr.isSessionSupported('immersive-vr').then((supported: boolean) => setVrSupported(supported));
    } else {
      setArSupported(false);
      setVrSupported(false);
    }
  }, []);

  useEffect(() => {
    const qModels = query(collection(db, 'models'));
    const unsubModels = onSnapshot(qModels, (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModelMetadata));
      setModels(m);
      setLoading(false);
    });

    const qInteractions = query(collection(db, 'interactions'));
    const unsubInteractions = onSnapshot(qInteractions, (snapshot) => {
      const i = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InteractionLogic));
      setInteractions(i);
    });

    return () => {
      unsubModels();
      unsubInteractions();
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-zinc-950">
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4 pointer-events-auto">
        {arSupported && (
          <button 
            onClick={() => store.enterAR()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-2xl shadow-emerald-500/30 transition-all flex items-center gap-2"
          >
            <Smartphone className="w-5 h-5" />
            Enter AR
          </button>
        )}
        
        {vrSupported && (
          <button 
            onClick={() => store.enterVR()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-2xl shadow-blue-500/30 transition-all flex items-center gap-2"
          >
            <Box className="w-5 h-5" />
            Enter VR
          </button>
        )}

        {(!arSupported && !vrSupported && arSupported !== null && vrSupported !== null) && (
          <div className="px-6 py-3 bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-400 text-xs rounded-full flex items-center gap-2">
            <Info className="w-4 h-4 text-zinc-500" />
            XR not supported on this device
          </div>
        )}
      </div>

      <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
        <XR store={store}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight 
              position={[5, 10, 5]} 
              intensity={1.5} 
              castShadow 
              shadow-mapSize={[1024, 1024]} 
            />
            
            <Grid 
              infiniteGrid 
              fadeDistance={50} 
              fadeStrength={5} 
              cellSize={1} 
              sectionSize={5} 
              sectionThickness={1.5} 
              sectionColor="#10b981" 
              cellColor="#334155"
            />

            {models.map((model) => (
              <ModelInstance 
                key={model.id} 
                model={model} 
                interactions={interactions.filter(i => i.modelId === model.id)} 
              />
            ))}

            <ContactShadows 
              opacity={0.4} 
              scale={20} 
              blur={2.4} 
              far={20} 
              resolution={256} 
              color="#000000" 
            />
            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
          </Suspense>
        </XR>
      </Canvas>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-40">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <span className="text-sm font-medium tracking-widest uppercase opacity-50">Loading Experience</span>
          </div>
        </div>
      )}
    </div>
  );
}
