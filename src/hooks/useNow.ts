// src/hooks/useNow.ts
'use client'
import { useEffect, useState } from 'react'

/**
 * Renvoie l'heure actuelle et force un re-render toutes les `intervalMs`.
 * Sert à recalculer en direct les statuts dépendant du temps (ex: une offre
 * qui passe automatiquement à "Expirée" quand sa date de fin est atteinte),
 * sans avoir besoin d'un événement serveur — chaque session cliente recalcule
 * le même résultat indépendamment à partir des mêmes dates.
 */
export function useNow(intervalMs = 15000): Date {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
