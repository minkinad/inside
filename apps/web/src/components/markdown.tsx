import type { ReactNode } from 'react';

function inline(value: string): ReactNode[] {
  let offset = 0;
  return value
    .split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\(https:\/\/[^)]+\))/g)
    .filter(Boolean)
    .map((part) => {
      const start = value.indexOf(part, offset);
      offset = start + part.length;
      const key = `${start}:${part}`;
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_'))
        return <em key={key}>{part.slice(1, -1)}</em>;
      const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
      if (link)
        return (
          <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>
        );
      return part;
    });
}

export function Markdown({ source }: { source: string }) {
  const output: ReactNode[] = [];
  let list: { line: number; text: string }[] = [];
  const flush = () => {
    if (list.length) {
      output.push(
        <ul key={`list-${list[0].line}`}>
          {list.map((item) => (
            <li key={item.line}>{inline(item.text)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const [lineNumber, line] of source.split(/\r?\n/).entries()) {
    if (line.startsWith('- ')) {
      list.push({ line: lineNumber, text: line.slice(2) });
      continue;
    }
    flush();
    if (line.trim()) output.push(<p key={`p-${lineNumber}`}>{inline(line)}</p>);
  }
  flush();
  return <div className="markdown">{output}</div>;
}
