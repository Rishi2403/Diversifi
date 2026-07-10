import ReactMarkdown from "react-markdown";

// Parse a GFM pipe-table block into headers + rows
function parsePipeTable(block: string): { headers: string[]; rows: string[][] } | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const isSep = (l: string) => /^\|?[\s\-:|]+(\|[\s\-:|]+)+\|?$/.test(l);
  const parseRow = (l: string) =>
    l
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const sepIdx = lines.findIndex(isSep);
  if (sepIdx < 1) return null;

  const headers = parseRow(lines[0]);
  const rows = lines.slice(sepIdx + 1).map(parseRow);
  return { headers, rows };
}

type Segment = { type: "text"; content: string } | { type: "table"; content: string };

// Split markdown content into text and table segments
function segmentContent(content: string): Segment[] {
  const lines = content.split("\n");
  const segments: Segment[] = [];
  let buffer: string[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const isPipeLine = (l: string): boolean => /^\s*\|/.test(l) || (l.includes("|") && /\|[-:\s|]+\|/.test(l));

  const flushText = () => {
    const t = buffer.join("\n").trim();
    if (t) segments.push({ type: "text", content: t });
    buffer = [];
  };
  const flushTable = () => {
    const t = tableBuffer.join("\n").trim();
    if (t) segments.push({ type: "table", content: t });
    tableBuffer = [];
  };

  for (const line of lines) {
    if (isPipeLine(line)) {
      if (!inTable) {
        flushText();
        inTable = true;
      }
      tableBuffer.push(line);
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      buffer.push(line);
    }
  }

  if (inTable) flushTable();
  else flushText();

  return segments;
}

interface ChatMarkdownProps {
  content: string;
  invert?: boolean; // true for user bubbles (white text)
}

export function ChatMarkdown({ content, invert }: ChatMarkdownProps) {
  const segments = segmentContent(content);

  const proseClass = [
    "prose prose-sm max-w-none",
    "dark:prose-invert",
    invert ? "prose-invert" : "",
    // Override global heading sizes via prose utilities
    "prose-headings:font-bold prose-headings:leading-snug prose-headings:mb-1 prose-headings:mt-3",
    "prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-h4:text-xs",
    "prose-p:mb-1 prose-p:last:mb-0 prose-p:leading-relaxed",
    "prose-ul:pl-4 prose-ul:mb-2 prose-ol:pl-4 prose-ol:mb-2",
    "prose-li:mb-0.5",
    "prose-strong:font-semibold",
    "prose-code:text-xs prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
    invert
      ? "prose-code:bg-white/20"
      : "prose-code:bg-black/10 dark:prose-code:bg-white/10",
    "prose-pre:text-xs prose-pre:rounded-lg prose-pre:overflow-x-auto",
    invert ? "prose-a:text-white prose-a:underline" : "prose-a:text-[#00D09C]",
  ]
    .filter(Boolean)
    .join(" ");

  const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
    // Headings — scoped small sizes for chat bubbles
    h1: ({ children }) => (
      <p className="text-base font-bold mt-3 mb-1 leading-snug">{children}</p>
    ),
    h2: ({ children }) => (
      <p className="text-sm font-bold mt-2 mb-1 leading-snug">{children}</p>
    ),
    h3: ({ children }) => (
      <p className="text-sm font-semibold mt-2 mb-0.5 leading-snug">{children}</p>
    ),
    h4: ({ children }) => (
      <p className="text-xs font-semibold mt-1 mb-0.5">{children}</p>
    ),
    h5: ({ children }) => <p className="text-xs font-medium mt-1">{children}</p>,
    h6: ({ children }) => <p className="text-xs font-medium mt-1">{children}</p>,
    // Keep lists compact
    p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ children, href }) => (
      <a
        href={href}
        className={invert ? "text-white underline" : "text-[#00D09C] hover:underline"}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({ children, className }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code
            className={`${className} block text-xs font-mono overflow-x-auto whitespace-pre`}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className={`text-xs font-mono px-1 py-0.5 rounded ${
            invert ? "bg-white/20" : "bg-black/10 dark:bg-white/10"
          }`}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={`text-xs rounded-lg p-3 overflow-x-auto my-2 ${
          invert ? "bg-black/20" : "bg-black/5 dark:bg-white/5"
        }`}
      >
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={`border-l-2 pl-3 my-2 italic ${
          invert
            ? "border-white/40 text-white/80"
            : "border-[#00D09C]/50 text-muted-foreground"
        }`}
      >
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr className={`my-3 border-0 border-t ${invert ? "border-white/20" : "border-border"}`} />
    ),
  };

  const tableClass = invert
    ? "border-white/20 text-white"
    : "border-border text-foreground";
  const thClass = invert
    ? "bg-white/15 text-white font-semibold"
    : "bg-muted text-foreground font-semibold";
  const tdClass = invert ? "border-white/20" : "border-border";
  const trAlt = invert ? "bg-white/5" : "bg-muted/40";

  return (
    <div className="text-sm space-y-0">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return (
            <div key={i} className={proseClass}>
              <ReactMarkdown components={mdComponents}>{seg.content}</ReactMarkdown>
            </div>
          );
        }

        // Table segment
        const parsed = parsePipeTable(seg.content);
        if (!parsed) {
          // Fallback: render as code block
          return (
            <pre
              key={i}
              className={`text-xs rounded p-2 overflow-x-auto my-2 font-mono ${
                invert ? "bg-black/20" : "bg-black/5 dark:bg-white/5"
              }`}
            >
              {seg.content}
            </pre>
          );
        }

        return (
          <div key={i} className="overflow-x-auto my-3">
            <table className={`w-full text-xs border-collapse border ${tableClass}`}>
              <thead>
                <tr>
                  {parsed.headers.map((h, j) => (
                    <th
                      key={j}
                      className={`px-3 py-2 text-left border ${tableClass} ${thClass}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? trAlt : ""}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-1.5 border ${tdClass}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
