"""
AI Note Generator - summarization engine.

Uses sumy's TextRank (pure-python, graph-based extractive summarization) so it
runs fully offline with no model download and no API key. This is the same
family of algorithm (graph centrality over sentence-similarity) that powers
many production "auto TL;DR" features, and it's swappable: the
`summarize_with_llm` stub below shows exactly where to plug in
Whisper-transcribed text -> an LLM call if/when the deployment has internet
access and wants higher-quality abstractive summaries.
"""
import re
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words

LANGUAGE_MAP = {"en": "english", "hi": "english", "te": "english"}
# hi/te fall back to english tokenizer/stemmer (sumy has no hi/te stemmers);
# the text itself can still be hi/te, TextRank is language-agnostic on scoring.


def _split_sentences(text: str):
    # naive sentence splitter fallback used for key-point extraction
    parts = re.split(r"(?<=[.!?।])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def summarize_transcript(text: str, language: str = "en", sentence_count: int = 5):
    text = (text or "").strip()
    if not text:
        return {"summary": "", "key_points": []}

    lang_key = LANGUAGE_MAP.get(language, "english")
    parser = PlaintextParser.from_string(text, Tokenizer(lang_key))
    stemmer = Stemmer(lang_key)
    summarizer = TextRankSummarizer(stemmer)
    summarizer.stop_words = get_stop_words(lang_key)

    sentences = _split_sentences(text)
    n = min(sentence_count, max(1, len(sentences)))

    try:
        ranked = summarizer(parser.document, n)
        summary_sentences = [str(s) for s in ranked]
    except Exception:
        summary_sentences = sentences[:n]

    summary = " ".join(summary_sentences)

    # Key points: shorter, top-3 highest-ranked sentences, trimmed
    key_points = [s if len(s) < 140 else s[:137] + "..." for s in summary_sentences[:3]]

    return {"summary": summary, "key_points": key_points}


def summarize_with_llm_stub(text: str, language: str = "en"):
    """
    Placeholder showing the swap point for an LLM-based abstractive summary
    (e.g. Claude API) when the deployment target has internet access.
    Not called by default -- summarize_transcript() above is what runs.
    """
    raise NotImplementedError(
        "Wire this to an LLM call (e.g. Anthropic API) for abstractive "
        "summaries when running with internet access."
    )
