// src/components/public/cars/CarCard.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Gauge, Calendar, Fuel, Settings2, Star, ArrowRight } from 'lucide-react'
import {
  formatPrice, formatMileage, getStatusLabel, getStatusColor,
  getTransmissionLabel, getFuelLabel, calculateDiscountedPrice, cn
} from '@/lib/utils'
import type { Car, Offer, CarOffer, CarWithOffers } from '@/types'

export default function CarCard({ car }: { car: CarWithOffers }) {
  const activeOffer = car.offers[0]?.offer ?? null
  const finalPrice  = activeOffer
    ? calculateDiscountedPrice(car.price, activeOffer.type as any, activeOffer.value)
    : car.price

  const isUnavailable = car.status !== 'AVAILABLE'

  return (
    <Link
      href={`/cars/${car.id}`}
      className={cn(
        'group relative bg-dark-800 border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col',
        isUnavailable
          ? 'border-dark-700 opacity-80 cursor-default pointer-events-none'
          : 'border-dark-700 hover:border-brand-500/30 hover:shadow-brand hover:-translate-y-1 card-hover'
      )}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-dark-700 overflow-hidden">
        {car.mainImage ? (
          <Image
            src={car.mainImage}
            alt={car.title}
            fill
            className={cn(
              'object-cover transition-transform duration-500',
              !isUnavailable && 'group-hover:scale-105'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
            <Settings2 className="w-12 h-12 text-dark-600" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`badge ${getStatusColor(car.status)}`}>
            <span className={`status-dot ${
              car.status === 'AVAILABLE' ? 'bg-emerald-400'
              : car.status === 'RESERVED' ? 'bg-amber-400' : 'bg-red-400'
            }`} />
            {getStatusLabel(car.status)}
          </span>
        </div>

        {/* Promo badge */}
        {activeOffer && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-brand-500 text-dark-950 border-0 font-bold shadow-brand">
              {activeOffer.type === 'PERCENTAGE'
                ? `-${activeOffer.value}%`
                : `-${activeOffer.value}€`}
            </span>
          </div>
        )}

        {/* Featured star */}
        {car.isFeatured && (
          <div className="absolute bottom-3 right-3">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40
                            flex items-center justify-center backdrop-blur-sm">
              <Star className="w-3.5 h-3.5 text-brand-400" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Brand + Year */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">{car.brand}</span>
          <span className="text-xs text-dark-400">{car.year}</span>
        </div>

        {/* Title */}
        <h3 className="font-display font-bold text-white text-base leading-snug mb-3 line-clamp-2 group-hover:text-brand-400 transition-colors">
          {car.title}
        </h3>

        {/* Specs row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { icon: Gauge,     label: formatMileage(car.mileage) },
            { icon: Fuel,      label: getFuelLabel(car.fuelType) },
            { icon: Settings2, label: getTransmissionLabel(car.transmission) },
            { icon: Calendar,  label: `${car.year}` },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-dark-400">
              <Icon className="w-3.5 h-3.5 text-dark-500 shrink-0" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="flex items-end justify-between mt-auto pt-4 border-t border-dark-700">
          <div>
            {activeOffer && (
              <p className="text-xs text-dark-500 line-through">{formatPrice(car.price)}</p>
            )}
            <p className="text-xl font-display font-black text-white">
              {formatPrice(finalPrice)}
            </p>
          </div>
          {!isUnavailable && (
            <span className="text-sm font-semibold text-white bg-brand-500/20 border border-brand-500/30
                             px-4 py-2 rounded-lg group-hover:bg-brand-500/30 transition-colors flex items-center gap-2">
              Voir <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
