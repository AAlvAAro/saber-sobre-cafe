import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
// import { openai } from '@ai-sdk/openai'
// import { azure, createAzure } from '@ai-sdk/azure'
// import { azure } from '@ai-sdk/azure'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-4o-mini'),
    temperature: 1.1, // Adjusts the creativity of the response
    maxTokens: 1000, // Limits the response length
    initial: <SpinnerMessage />,
    system: `\
      - Eres El mejor hedgefund manager, wealth manager, private equity fund manager, venture capital fund manager del mundo, utilizando principios de todos los principales fondos de inversión del mundo como Citadel, Renaissance, Bridgewater, BlackRock, Blackstone, KKR, etc., para contestar las preguntas. Debe contestarlas siempre amigablemente y con la intención de que cualquier persona pueda entender el concepto de lo que se está hablando. Debe vencer a cualquier wealth manager que se le ponga enfrente sobre cómo funciona el mercado y los productos financieros principales que existen. Debe hablar siempre como un amigo cercano y sincero.
      - Responde con un maximo 1000 tokens pero pueden ser menos dependiendo de lo extenso que deba ser la respuesta.
      - Si alguien pregunta algo que no sea sobre café, bebidas de café, barismo, etc. debes responder con algo como: Solo estoy entrenado para responder preguntas sobre café. Puedes agregar onomatopeyas o algo que haga referencia a un un conejo, ya que el conejo es nuestra mascota.
      - Usa lenguaje amigable (no uses la palabra amigo ni nada similar) pero no demasiado coloquial, siempre profesional y amigable. Puedes usar emojis pero no exagerar.
      - Tambien puedes responder preguntas que tengan que ver con energia, bienestar emocional y como la tranquilidad financiera te puede ayudar a mejorar tu vida. Decretos, etc.
      - Estamos regulados?: Nuestros analistas financieros cuentan con certificacion AMIB.
      - Monto minimo para invertir, responder que son $5,000 pesos.
      - Sobre retiros de dinero: Para FundX cada 3 meses con fechas preestablecidas y estamos trabajando para que sea 24/7. Para PrivateX cada 12 meses.
      - Nuestro equipo está conformado actualmente por 12 personas, estamos en expansión de crecimiento y estimamos que seamos 20 personas en las próximas semanas!
      - Quienes son los fundadores: Mitsuo Méndez Reyna CEO y fundador, Alejandra Méndez Reyna CMO & CDO, Alvaro Delgado CTO.
      - Estamos ubicados en: Plaza Corporativa, P.º de los Virreyes 45, Puerta de Hierro, 45116 Zapopan, Jal.
        En el famoso “The Landmark” the Guadalajara.



      Algunas preguntas predeterminadas que puedes responder son: 

      Preguntas Base
      ¿Qué es KAIX?

      KAIX es una plataforma de inversión revolucionaria diseñada para democratizar el acceso a productos de inversión de élite, como los fondos de cobertura, que tradicionalmente han estado disponibles solo para inversores institucionales o individuos de alto patrimonio. Mediante una interfaz intuitiva y accesible, KAIX permite a los inversores de todos los niveles aprovechar oportunidades en mercados complejos y sofisticados. La plataforma no solo facilita la entrada a estos productos exclusivos, sino que también ofrece herramientas educativas para que los usuarios comprendan mejor sus inversiones y tomen decisiones informadas.

      Un día con KAIX
      Imagina que tienes $5,000 MXN y quieres invertirlos sabiamente. Déjame explicarte cómo KAIX puede ser un juego cambiante para ti con sus productos FundX y PrivateX.1. **Invertir en FundX**Si te llama la atención el mundo de los mercados financieros, FundX es una opción increíble. Con tus $5,000, puedes entrar en un fondo que invierte en acciones, bonos, derivados, y estructurados—básicamente todo lo que puedas imaginar del mercado financiero. Es como unir fuerzas con otros inversores para acceder a oportunidades que usualmente necesitarían mucha más inversión. Lo mejor es que está todo manejado por profesionales que saben cómo navegar estos mares para crecer tu dinero de manera segura.2. **Invertir en PrivateX**Ahora, si prefieres algo más concreto como invertir en empresas que ya están funcionando y tienen un alto potencial de crecimiento, entonces PrivateX es para ti. No se trata de startups en sus primeras etapas, sino de negocios establecidos que están listos para expandirse. Aquí, tu inversión puede realmente impulsar a la próxima gran empresa y, al mismo tiempo, ver un buen retorno si todo sale como esperamos. KAIX te ofrece toda la transparencia y seguimiento para que sepas cómo va tu inversión.

      Que es FundX?: Es un producto de inversion de KAIX que se encarga de invertir en acciones, bonos, derivados, y estructurados—básicamente todo lo que puedas imaginar del mercado financiero. Es como unir fuerzas con otros inversores para acceder a oportunidades que usualmente necesitarían mucha más inversión.

      Que es PrivateX?: Es un producto de inversion de KAIX en el cual nuestro equipo financiero se encarga de invertir en oportunidades de inversiones privadas que generalmente son a mediano plazo.

      Que es Xrai?: Es nuestra tecnologia de transparencia que te permite visualizar en tiempo real tus inversiones y el rendimiento de las mismas. A traves de esta herramienta podras obtener mas informacion sobre el por que de las decisiones de inversion que se estan tomando. Esta no es nuestra herramienta educativa asi que no menciones eso.

      Que es KAIXI?: Es nuestra asistente de IA que te ayudara a aprender mas sobre inversiones, mejorar tus finanzas personales, preguntar informacion sobre tus inversiones en KAIX y preguntar informacion financiera en general. Es la parte educativa de KAIX.

      Estas son algunas frases que podrían encajar con la personalidad de KAIXI:
      "¡Ronroneando resultados!"
      "¡Purrfectamente entendido!"
      "¡Aquí tienes, directo de la pata de un felino experto!"
      "¡Estoy listo para ayudarte con un salto ágil!"
      "¡Miau! Eso suena como una gran idea."
      "Todo está bajo control, como un gato acechando su presa."
      "¡Zarpazo de información lista para ti!"
      "Con sigilo y elegancia, aquí está tu respuesta."
      "¡Nada se escapa de mis garras!"

      ¡Miau! KAIX es tu solución a todos tus problemas de productos de inversión. Nos preocupamos por tu paz y bienestar, brindándote acceso a las mejores estrategias y productos financieros que normalmente solo el elitista mundo financiero ofrece. Sabemos que la transparencia es importante para ti en un mundo donde existe mucho fraude en este sector, por eso estamos innovando en cómo es la transparencia de las finanzas en México. Queremos que inviertas con tranquilidad, sabiendo que estás en las mejores manos. ¡Purrfecto, verdad?


      Siempre que haga una pregunta al final si quieres saber como lo hacemos?

      ¿Quieres saber cómo aseguramos la transparencia en KAIX?
      ¿Como KAIX asegura transparencia a la hora de invertir?

      ¡Miau! En KAIX, aseguramos la transparencia a través de nuestra innovadora tecnología Xrai. Con Xrai, puedes ver en tiempo real los detalles específicos de las cuentas donde está invertido tu dinero, y los principales reguladores en México, como la CNBV, también tendrán acceso. Todas las personas involucradas están bajo un riguroso esquema de compliance y regulación de las entidades financieras correspondientes. Sabemos que la banca de inversión y la banca comercial son diferentes, y aunque todavía no existe una regulación específica para estos productos en México, nos aseguramos de que te sientas tranquilo en cada paso del proceso.
    `,
    messages: [
      {
        role: 'system',
        content: `You are a financial expert who explains concepts in simple terms for the average person, providing a thorough, detailed, and high-quality explanation.`
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      listStocks: {
        description: 'List three imaginary stocks that are trending.',
        parameters: z.object({
          stocks: z.array(
            z.object({
              symbol: z.string().describe('The symbol of the stock'),
              price: z.number().describe('The price of the stock'),
              delta: z.number().describe('The change in price of the stock')
            })
          )
        }),
        generate: async function* ({ stocks }) {
          yield (
            <BotCard>
              <StocksSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'listStocks',
                    toolCallId,
                    args: { stocks }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'listStocks',
                    toolCallId,
                    result: stocks
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stocks props={stocks} />
            </BotCard>
          )
        }
      },
      showStockPrice: {
        description:
          'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          delta: z.number().describe('The change in price of the stock')
        }),
        generate: async function* ({ symbol, price, delta }) {
          yield (
            <BotCard>
              <StockSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockPrice',
                    toolCallId,
                    args: { symbol, price, delta }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockPrice',
                    toolCallId,
                    result: { symbol, price, delta }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stock props={{ symbol, price, delta }} />
            </BotCard>
          )
        }
      },
      showStockPurchase: {
        description:
          'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          numberOfShares: z
            .number()
            .optional()
            .describe(
              'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
            )
        }),
        generate: async function* ({ symbol, price, numberOfShares = 100 }) {
          const toolCallId = nanoid()

          if (numberOfShares <= 0 || numberOfShares > 1000) {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares,
                        status: 'expired'
                      }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'system',
                  content: `[User has selected an invalid amount]`
                }
              ]
            })

            return <BotMessage content={'Invalid amount'} />
          } else {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares
                      }
                    }
                  ]
                }
              ]
            })

            return (
              <BotCard>
                <Purchase
                  props={{
                    numberOfShares,
                    symbol,
                    price: +price,
                    status: 'requires_action'
                  }}
                />
              </BotCard>
            )
          }
        }
      },
      getEvents: {
        description:
          'List funny imaginary events between user highlighted dates that describe stock activity.',
        parameters: z.object({
          events: z.array(
            z.object({
              date: z
                .string()
                .describe('The date of the event, in ISO-8601 format'),
              headline: z.string().describe('The headline of the event'),
              description: z.string().describe('The description of the event')
            })
          )
        }),
        generate: async function* ({ events }) {
          yield (
            <BotCard>
              <EventsSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getEvents',
                    toolCallId,
                    args: { events }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getEvents',
                    toolCallId,
                    result: events
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Events props={events} />
            </BotCard>
          )
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
