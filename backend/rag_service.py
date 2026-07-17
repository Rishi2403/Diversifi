"""
rag_service.py - RAG pipeline over NSDL Finance PDF.

Pipeline:
  1. Load & chunk the PDF with PyPDFLoader
  2. Embed chunks via HuggingFace sentence-transformers
  3. Persist a Chroma vector store on disk
  4. Expose query_finance_kb(question) -> str for answer retrieval
"""

import os
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.chains import RetrievalQA
from langchain_anthropic import ChatAnthropic

PDF_PATH = Path(__file__).parent / "finance_pdfs" / "NSDL_Finance.pdf"
# CHROMA_DIR = Path(__file__).parent / "finance_db" / "nsdl_chroma"
CHROMA_DIR = Path(__file__).parent / "finance_db"
EMBED_MODEL = "all-MiniLM-L6-v2"
ANTHROPIC_MODEL = "claude-sonnet-4-6"


def _build_vectorstore() -> Chroma:
    """Load PDF, split, embed, and persist to Chroma."""
    loader = PyPDFLoader(str(PDF_PATH))
    pages = loader.load()

    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    docs = splitter.split_documents(pages)

    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=str(CHROMA_DIR),
    )
    return vectorstore


def _load_vectorstore() -> Chroma:
    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    return Chroma(persist_directory=str(CHROMA_DIR), embedding_function=embeddings)


def get_vectorstore() -> Chroma:
    """Return existing Chroma store or build it from scratch."""
    if CHROMA_DIR.exists() and any(CHROMA_DIR.iterdir()):
        return _load_vectorstore()
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    return _build_vectorstore()


def query_finance_kb(question: str, k: int = 4) -> str:
    """
    Retrieve the k most relevant chunks from the NSDL Finance PDF
    and generate an answer via the Groq LLM.
    """
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": k})

    _api_key = os.getenv("ANTHROPIC_API_KEY", "")
    _resource = os.getenv("ANTHROPIC_FOUNDRY_RESOURCE", "")
    _url = (
        f"https://{_resource}.services.ai.azure.com/anthropic" if _resource else "https://api.anthropic.com"
    )
    _headers = {"Authorization": f"Bearer {_api_key}"} if _resource else {}

    llm = ChatAnthropic(
        model=ANTHROPIC_MODEL,
        anthropic_api_key=_api_key,
        anthropic_api_url=_url,
        default_headers=_headers,
    )

    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=False,
    )

    result = chain.invoke({"query": question})
    return result.get("result", "No answer found.")


if __name__ == "__main__":
    # Quick smoke-test: build the index and run a sample query.
    print("Building / loading NSDL Finance knowledge base …")
    ans = query_finance_kb("What services does NSDL Finance offer?")
    print("Answer:", ans)
