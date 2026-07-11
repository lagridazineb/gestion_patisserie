import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setNotifications((prev) => [...prev, { id, message, type }])
    setTimeout(() => { setNotifications((prev) => prev.filter((n) => n.id !== id)) }, 3000)
  }, [])

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`pointer-events-auto px-5 py-3.5 rounded-xl text-sm font-medium shadow-gold-lg backdrop-blur-md border
                ${notif.type === 'success' ? 'bg-diana-card/95 border-diana-gold/30 text-diana-gold' :
                  notif.type === 'error' ? 'bg-red-900/90 border-red-500/30 text-red-300' :
                  notif.type === 'warning' ? 'bg-amber-900/90 border-amber-500/30 text-amber-300' :
                  'bg-diana-card/95 border-diana-gold/30 text-diana-cream'}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">
                  {notif.type === 'success' ? '✓' : notif.type === 'error' ? '✕' : notif.type === 'warning' ? '⚠' : 'ℹ'}
                </span>
                <span>{notif.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotification must be used within NotificationProvider')
  return context
}