import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4 text-center">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-xl">
          ¿Qué quieres saber sobre café?
        </h1>
        {/* <p className="leading-relaxed text-muted-foreground">
          Explora conceptos financieros, estrategias de inversión, diversificación de portafolio y más con nuestro asistente de IA especializado en inversiones. ¡Obtén respuestas claras y consejos útiles al instante!
        </p> */}
      </div>
    </div>
  )
}
