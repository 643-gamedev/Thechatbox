
import React, { useState } from 'react';
import { Play, Save, Copy, Trash2, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

const LANGUAGES = [
  { value: 'python', label: 'Python', ext: '.py', template: '# Python\nprint("Hello, World!")\n' },
  { value: 'javascript', label: 'JavaScript', ext: '.js', template: '// JavaScript\nconsole.log("Hello, World!");\n' },
  { value: 'cpp', label: 'C++', ext: '.cpp', template: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n' },
  { value: 'c', label: 'C', ext: '.c', template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n' },
  { value: 'bash', label: 'Bash', ext: '.sh', template: '#!/bin/bash\necho "Hello, World!"\n' },
  { value: 'html', label: 'HTML', ext: '.html', template: '<!DOCTYPE html>\n<html>\n<head>\n    <title>Hello</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>\n' },
  { value: 'css', label: 'CSS', ext: '.css', template: '/* CSS */\nbody {\n    background: #0a0a0a;\n    color: #39FF14;\n    font-family: monospace;\n}\n' },
  { value: 'rust', label: 'Rust', ext: '.rs', template: 'fn main() {\n    println!("Hello, World!");\n}\n' },
  { value: 'go', label: 'Go', ext: '.go', template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n' },
  { value: 'java', label: 'Java', ext: '.java', template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n' },
];

export default function CodeEditor() {
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [title, setTitle] = useState('untitled');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const { data: snippets = [] } = useQuery({
    queryKey: ['snippets'],
    queryFn: () => db.entities.CodeSnippet.list('-created_date', 20),
  });

  const handleLanguageChange = (val) => {
    setLanguage(val);
    const lang = LANGUAGES.find(l => l.value === val);
    if (lang) setCode(lang.template);
  };

  const handleSave = async () => {
    const user = await db.auth.me();
    await db.entities.CodeSnippet.create({
      title,
      language,
      code,
      author_email: user.email,
    });
    queryClient.invalidateQueries({ queryKey: ['snippets'] });
    toast.success('Snippet saved');
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput('> Compiling...\n');
    const result = await db.integrations.Core.InvokeLLM({
      prompt: `You are a code execution simulator. Simulate running this ${language} code and show what the output would be. Only show the output, nothing else. If there are errors, show the error messages as they would appear in a real terminal.\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``,
    });
    setOutput(`> Output:\n${result}`);
    setRunning(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  const loadSnippet = (snippet) => {
    setTitle(snippet.title);
    setLanguage(snippet.language);
    setCode(snippet.code);
  };

  const currentLang = LANGUAGES.find(l => l.value === language);
  const lineCount = code.split('\n').length;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card flex-shrink-0 overflow-x-auto">
          <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-32 h-7 text-xs bg-background border-border"
          />
          <span className="text-muted-foreground text-xs">{currentLang?.ext}</span>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-28 h-7 text-xs bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {LANGUAGES.map(l => (
                <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border" onClick={handleCopy}>
            <Copy className="w-3 h-3" /> Copy
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border" onClick={handleSave}>
            <Save className="w-3 h-3" /> Save
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleRun} disabled={running}>
            <Play className="w-3 h-3" /> {running ? 'Running...' : 'Run'}
          </Button>
        </div>

        {/* Code area with line numbers */}
        <div className="flex-1 flex overflow-hidden">
          {/* Line numbers */}
          <div className="w-12 bg-card border-r border-border py-3 overflow-hidden flex-shrink-0">
            <div className="text-right pr-3">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="text-[10px] text-muted-foreground leading-5 h-5">{i + 1}</div>
              ))}
            </div>
          </div>
          {/* Editor */}
          <Textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 bg-background border-none rounded-none text-xs leading-5 resize-none p-3 focus-visible:ring-0 focus-visible:ring-offset-0"
            spellCheck={false}
            style={{ lineHeight: '20px' }}
          />
        </div>

        {/* Output panel */}
        {output && (
          <div className="h-40 border-t border-border bg-background p-3 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground tracking-wider">OUTPUT</span>
              <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setOutput('')}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <pre className="text-xs whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>

      {/* Saved snippets sidebar */}
      <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-border bg-card overflow-y-auto flex-shrink-0 max-h-48 md:max-h-full">
        <div className="p-3 border-b border-border">
          <span className="text-[10px] tracking-wider text-muted-foreground">SAVED SNIPPETS</span>
        </div>
        <div className="p-2 space-y-1">
          {snippets.map(s => (
            <button
              key={s.id}
              onClick={() => loadSnippet(s)}
              className="w-full text-left px-2 py-2 rounded hover:bg-secondary transition-colors"
            >
              <div className="text-xs truncate">{s.title}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                <span>{s.language}</span>
                {s.created_date && <span>{format(new Date(s.created_date), 'MMM d')}</span>}
              </div>
            </button>
          ))}
          {snippets.length === 0 && (
            <p className="text-[10px] text-muted-foreground px-2 py-4">No snippets saved yet</p>
          )}
        </div>
      </div>
    </div>
  );
}