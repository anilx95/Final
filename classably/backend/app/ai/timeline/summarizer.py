from collections import Counter


class TimelineSummarizer:

    def summarize(

        self,

        events,

    ):

        counter = Counter()

        for event in events:

            counter[event.event_type] += 1

        return {

            "total_events": len(events),

            "counts": dict(counter),

        }


summarizer = TimelineSummarizer()