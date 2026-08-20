import React from "react";
import { motion } from "framer-motion";

interface IconProps {
  className?: string;
  size?: number;
}

/** Animated Solar Radiance Icon */
export const AnimatedSunIcon: React.FC<IconProps> = ({ className = "h-5 w-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <motion.circle
      cx="12"
      cy="12"
      r="4"
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ originX: "12px", originY: "12px" }}
    >
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </motion.g>
  </svg>
);

/** Animated Water Droplet & Flow */
export const AnimatedWaterIcon: React.FC<IconProps> = ({ className = "h-5 w-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <motion.path
      d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
      animate={{ y: [0, -1.5, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path
      d="M8.5 14a3.5 3.5 0 0 0 7 0"
      animate={{ opacity: [0.3, 0.9, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  </svg>
);

/** Animated Map Location Pin */
export const AnimatedPinIcon: React.FC<IconProps> = ({ className = "h-5 w-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <motion.path
      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.circle
      cx="12"
      cy="10"
      r="3"
      animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  </svg>
);

/** Animated Power & Energy Pulse */
export const AnimatedZapIcon: React.FC<IconProps> = ({ className = "h-5 w-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <motion.polygon
      points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
      animate={{ opacity: [0.75, 1, 0.75], scale: [0.97, 1.03, 0.97] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      style={{ originX: "12px", originY: "12px" }}
    />
  </svg>
);

/** Animated Rotating Impeller / Pump Motor Icon */
export const AnimatedPumpIcon: React.FC<IconProps> = ({ className = "h-5 w-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="9" />
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      style={{ originX: "12px", originY: "12px" }}
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M12 9V4" />
      <path d="M12 15V20" />
      <path d="M9 12H4" />
      <path d="M15 12H20" />
    </motion.g>
  </svg>
);

/** Animated Gauge / Flow Pulse Icon */
export const AnimatedGaugeIcon: React.FC<IconProps> = ({ className = "h-5 w-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <motion.path
      d="M22 12h-4l-3 9L9 3l-3 9H2"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  </svg>
);
