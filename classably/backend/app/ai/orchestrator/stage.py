from abc import ABC, abstractmethod


class PipelineStage(ABC):

    @property
    def name(self):
        return self.__class__.__name__

    @abstractmethod
    def process(self, context):
        pass