'use client';

import { motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface GlassWindowProps {
  children: ReactNode;
  title?: string;
  className?: string;
  dragEnabled?: boolean;
}

export default function GlassWindow({ children, title, className = '', dragEnabled = false }: GlassWindowProps) {
  return (
    <motion.div
      drag={dragEnabled}
      dragMomentum={false}
      dragElastic={0.1}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`
        backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl
        overflow-hidden hover:shadow-teal-500/20 hover:border-white/30 transition-all duration-300
        ${className}
      `}
    >
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-rose-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  );
}
