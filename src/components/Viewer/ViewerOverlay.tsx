import React from 'react';
import { motion } from 'motion/react';
import { Info, Maximize2, RotateCw, Move, Layers, Activity } from 'lucide-react';

export default function ViewerOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top Left: Status */}
      <div className="absolute top-6 left-6 pointer-events-auto">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-3 px-4 py-2 bg-zinc-950/50 backdrop-blur-md border border-white/5 rounded-full"
        >
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase opacity-70">WebXR Session Ready</span>
        </motion.div>
      </div>

      {/* Top Right: Controls */}
      <div className="absolute top-6 right-6 pointer-events-auto flex flex-col gap-3">
        {[
          { icon: Info, label: 'Info' },
          { icon: Layers, label: 'Disassemble' },
          { icon: Activity, label: 'Animations' },
        ].map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="w-12 h-12 flex items-center justify-center bg-zinc-950/50 backdrop-blur-md border border-white/5 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group"
          >
            <item.icon className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
          </motion.button>
        ))}
      </div>

      {/* Bottom Right: Manipulation Help */}
      <div className="absolute bottom-24 right-6 pointer-events-auto">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-950/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl space-y-3"
        >
          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Manipulation</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs">
              <Move className="w-4 h-4 text-emerald-500" />
              <span>Drag to Move</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <RotateCw className="w-4 h-4 text-emerald-500" />
              <span>Two Fingers to Rotate</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Maximize2 className="w-4 h-4 text-emerald-500" />
              <span>Pinch to Scale</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Center: Interaction Prompt */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs font-medium opacity-40 text-center"
        >
          Tap objects to interact or reveal details
        </motion.p>
      </div>
    </div>
  );
}
