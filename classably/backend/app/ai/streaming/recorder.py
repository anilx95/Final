class Recorder:

    async def save(

        self,

        repository,

        context,

    ):

        if repository is None:

            return

        await repository.save_pipeline_result(

            context

        )


recorder = Recorder()