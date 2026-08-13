class Broadcaster:

    async def broadcast(

        self,

        manager,

        context,

    ):

        if manager is None:

            return

        await manager.broadcast(

            {

                "analytics": context.analytics,

                "timeline": context.timeline,

                "navigation": context.navigation,

                "voice": context.voice_messages,

                "alerts": context.alerts,

                "metadata": context.metadata,

            }

        )


broadcaster = Broadcaster()