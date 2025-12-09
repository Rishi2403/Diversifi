from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma 
from langchain_community.embeddings import HuggingFaceEmbeddings
import glob

PDF_FOLDER = "./finance_pdfs"
CHROMA_DB = "./finance_db"

def build_finance_knowledge_base():
    pdf_files = glob.glob(f"{PDF_FOLDER}/*.pdf")
    all_docs = []

    print(f"Found PDFs: {pdf_files}")

    for pdf in pdf_files:
        loader = PyPDFLoader(pdf)
        docs = loader.load()
        all_docs.extend(docs)

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = splitter.split_documents(all_docs)

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DB
    )

    vectordb.persist()
    print("Knowledge base built and stored successfully!")

if __name__ == "__main__":
    build_finance_knowledge_base()
