// src/app/(public)/cgv/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente',
  description: 'Conditions générales de vente de LME Occasions.',
}

export default function CGVPage() {
  return (
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-black text-3xl text-white mb-2">Conditions Générales de Vente</h1>
        <p className="text-dark-400 text-sm mb-10">Dernière mise à jour : {new Date().getFullYear()}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-dark-300">
          {[
            {
              title: '1. Objet',
              content: `Les présentes CGV régissent les conditions de vente de véhicules d'occasion proposés par LME Occasions. Toute commande ou réservation implique l'acceptation pleine et entière des présentes conditions.`,
            },
            {
              title: '2. Acompte de réservation',
              content: `Pour réserver un véhicule, le client est invité à verser un acompte de 30% du prix de vente total du véhicule. Cet acompte est encaissé immédiatement par voie électronique sécurisée (Stripe). La réservation est confirmée dès réception du paiement.`,
            },
            {
              title: '3. Délai de finalisation',
              content: `Suite au versement de l'acompte, le client dispose d'un délai de 5 jours calendaires pour se présenter en agence et régler le solde du prix de vente. Passé ce délai, la réservation expire automatiquement.`,
            },
            {
              title: '4. Non-remboursement de l\'acompte',
              content: `En cas de non-présentation du client dans le délai imparti, l'acompte versé est acquis définitivement à LME Occasions à titre d'indemnité d'immobilisation. Aucun remboursement ne sera effectué, sauf accord exceptionnel et écrit de la direction.`,
            },
            {
              title: '5. Disponibilité des véhicules',
              content: `Les véhicules sont proposés dans la limite des stocks disponibles. LME Occasions s'engage à mettre à jour en temps réel la disponibilité des véhicules. Toutefois, en cas d'indisponibilité constatée après confirmation, le client sera remboursé intégralement.`,
            },
            {
              title: '6. Paiement',
              content: `Le solde du prix de vente est payable en agence uniquement, par carte bancaire, virement bancaire ou chèque de banque. Aucun paiement en espèces au-delà du plafond légal autorisé. Le paiement par plusieurs fois (3x ou 4x) est possible sur certains véhicules selon conditions.`,
            },
            {
              title: '7. Transfert de propriété',
              content: `Le transfert de propriété du véhicule intervient au moment du paiement intégral du prix de vente et de la remise des clés au client en agence.`,
            },
            {
              title: '8. Garantie',
              content: `Conformément à la législation en vigueur, les véhicules d'occasion bénéficient d'une garantie légale de conformité. Des garanties complémentaires peuvent être proposées par LME Occasions selon les véhicules.`,
            },
            {
              title: '9. Responsabilité',
              content: `LME Occasions ne saurait être tenu responsable des dommages indirects ou consécutifs liés à l'utilisation du site web ou au processus d'achat en ligne. La responsabilité de LME Occasions est limitée au montant de l'acompte versé.`,
            },
            {
              title: '10. Litiges',
              content: `En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, tout litige sera soumis aux tribunaux compétents de Paris, France, conformément au droit français.`,
            },
          ].map(({ title, content }) => (
            <section key={title} className="border-b border-dark-800 pb-6">
              <h2 className="font-display font-bold text-white text-lg mb-3">{title}</h2>
              <p className="leading-relaxed">{content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
