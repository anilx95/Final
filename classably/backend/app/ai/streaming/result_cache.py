class ResultCache:

    def __init__(self):

        self.result = None

    def update(
        self,
        result,
    ):

        self.result = result

    def get(self):

        return self.result


result_cache = ResultCache()