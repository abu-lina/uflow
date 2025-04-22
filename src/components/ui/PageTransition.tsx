'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface PageTransitionProps {
  children: React.ReactNode
  delay?: number
  sectionType?: 'hero' | 'why' | 'projects' | 'about'
}

export default function PageTransition({ children, delay = 0, sectionType = 'hero' }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])

  const getAnimationProps = () => {
    switch (sectionType) {
      case 'why':
        return {
          initial: { opacity: 0, y: 100, scale: 0.95 },
          animate: isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 100, scale: 0.95 },
          transition: {
            duration: 1.2,
            ease: [0.4, 0, 0.2, 1],
            y: { type: "spring", stiffness: 60, damping: 15 },
            scale: { type: "spring", stiffness: 100, damping: 20 }
          }
        }
      default:
        return {
          initial: { opacity: 0, y: 50 },
          animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 },
          transition: {
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
            y: { type: "spring", stiffness: 100, damping: 20 }
          }
        }
    }
  }

  return (
    <motion.div
      {...getAnimationProps()}
      className="w-full"
    >
      {children}
    </motion.div>
  )
} 