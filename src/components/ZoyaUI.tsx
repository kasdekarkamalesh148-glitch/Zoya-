
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Loader2, AlertCircle } from 'lucide-react';
import { useLiveSession, SessionState } from '../hooks/use-live-session';

const ZoyaUI: React.FC = () => {
  const { state, error, connect, disconnect } = useLiveSession();
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (state: SessionState) => {
    switch (state) {
      case 'connecting': return 'text-blue-400';
      case 'connected': return 'text-green-400';
      case 'listening': return 'text-purple-400';
      case 'speaking': return 'text-pink-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (state: SessionState) => {
    switch (state) {
      case 'connecting': return 'Waking up...';
      case 'connected': return 'Ready for you, babe.';
      case 'listening': return 'I\'m listening...';
      case 'speaking': return 'Zoya is talking...';
      case 'error': return 'Oops, something went wrong.';
      default: return 'Tap to wake me up.';
    }
  };

  const handleToggle = () => {
    if (state === 'disconnected' || state === 'error') {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden font-sans text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: state === 'speaking' ? [0.1, 0.3, 0.1] : [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] ${
            state === 'speaking' ? 'bg-pink-500' : state === 'listening' ? 'bg-purple-500' : 'bg-blue-500'
          }`}
        />
      </div>

      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-12 flex flex-col items-center"
      >
        <h1 className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-500">
          ZOYA
        </h1>
        <p className={`mt-2 text-sm font-medium tracking-wide uppercase ${getStatusColor(state)}`}>
          {getStatusText(state)}
        </p>
      </motion.div>

      {/* Central Button / Visualizer */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {state === 'speaking' && (
            <motion.div
              key="speaking-rings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 2],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.6,
                    ease: "easeOut",
                  }}
                  className="absolute w-48 h-48 border-2 border-pink-500 rounded-full"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleToggle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
            state === 'disconnected' ? 'bg-zinc-900 border-2 border-zinc-800' :
            state === 'connecting' ? 'bg-blue-900/20 border-2 border-blue-500/50' :
            state === 'error' ? 'bg-red-900/20 border-2 border-red-500/50' :
            'bg-gradient-to-br from-pink-500 to-purple-600 border-none'
          }`}
        >
          <AnimatePresence mode="wait">
            {state === 'disconnected' ? (
              <motion.div key="power" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Power className="w-12 h-12 text-zinc-400" />
              </motion.div>
            ) : state === 'connecting' ? (
              <motion.div key="loader" initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="w-12 h-12 text-blue-400" />
              </motion.div>
            ) : state === 'error' ? (
              <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <AlertCircle className="w-12 h-12 text-red-500" />
              </motion.div>
            ) : (
              <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                {state === 'speaking' ? (
                  <div className="flex items-end gap-1 h-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [8, 32, 8] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                        className="w-1.5 bg-white rounded-full"
                      />
                    ))}
                  </div>
                ) : (
                  <Mic className="w-12 h-12 text-white" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 text-center px-8"
      >
        {error ? (
          <p className="text-red-400 text-sm max-w-xs">{error}</p>
        ) : (
          <p className="text-zinc-500 text-xs tracking-widest uppercase">
            {state === 'disconnected' ? 'Ready for some fun?' : 'Speak your mind, I\'m all ears.'}
          </p>
        )}
      </motion.div>

      {/* Subtle Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />
    </div>
  );
};

export default ZoyaUI;
