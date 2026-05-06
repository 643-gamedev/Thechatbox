

import React, { useState, useRef, useEffect } from 'react';

const FILESYSTEM = {
  '/': ['home', 'etc', 'var', 'usr', 'tmp'],
  '/home': ['user'],
  '/home/user': ['projects', 'notes.txt', '.bashrc'],
  '/home/user/projects': ['thechatbox', 'scripts'],
  '/home/user/projects/thechatbox': ['src', 'package.json', 'README.md'],
  '/etc': ['hosts', 'passwd', 'nginx.conf'],
  '/var': ['log'],
  '/var/log': ['syslog', 'auth.log'],
  '/usr': ['bin', 'local'],
  '/tmp': [],
};

const FILE_CONTENTS = {
  '/home/user/notes.txt': 'remember to push to prod\ntodo: fix the bug in auth\n',
  '/home/user/.bashrc': 'export PATH="$HOME/.local/bin:$PATH"\nalias ll="ls -la"\n',
  '/home/user/projects/thechatbox/README.md': '# Thechatbox\nA developer chat platform.\n',
  '/home/user/projects/thechatbox/package.json': '{\n  "name": "thechatbox",\n  "version": "1.0.0"\n}\n',
  '/etc/hosts': '127.0.0.1 localhost\n::1 localhost\n',
  '/etc/nginx.conf': 'server {\n  listen 80;\n  server_name thechatbox.dev;\n}\n',
};

const SUDO_PASS = 'password';

function resolvePath(cwd, input) {
  if (input.startsWith('/')) return input.replace(/\/+$/, '') || '/';
  const parts = (cwd + '/' + input).split('/').filter(Boolean);
  const resolved = [];
  for (const p of parts) {
    if (p === '..') resolved.pop();
    else if (p !== '.') resolved.push(p);
  }
  return '/' + resolved.join('/');
}

// Nano editor state outside component to persist
let nanoState = null;

export default function TerminalPage() {
  const [history, setHistory] = useState([
    { type: 'output', text: 'Thechatbox Terminal — Debian GNU/Linux 12' },
    { type: 'output', text: 'Type "help" for available commands.\n' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/home/user');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);

  // nano editor
  const [nanoOpen, setNanoOpen] = useState(false);
  const [nanoFile, setNanoFile] = useState('');
  const [nanoContent, setNanoContent] = useState('');

  // sudo
  const [sudoQueue, setSudoQueue] = useState(null); // { cmd, args }
  const [sudoInput, setSudoInput] = useState('');
  const [sudoAttempts, setSudoAttempts] = useState(0);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const nanoRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const prompt = `user@thechatbox:${cwd === '/home/user' ? '~' : cwd}$`;

  const addOut = (text) => setHistory(h => [...h, { type: 'output', text }]);
  const addIn = (text) => setHistory(h => [...h, { type: 'input', text }]);

  const executeSudoCommand = (cmd, args) => {
    switch (cmd) {
      case 'apt':
      case 'apt-get':
        if (args[0] === 'install') {
          const pkg = args[1] || '<package>';
          addOut(`Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  ${pkg}\n0 upgraded, 1 newly installed, 0 to remove.\nGet:1 http://deb.debian.org/debian bookworm/main amd64 ${pkg} [42.0 kB]\nFetched 42.0 kB in 0s\nSelecting previously unselected package ${pkg}.\nSetting up ${pkg}...\nProcessing triggers for man-db...\n`);
        } else if (args[0] === 'update') {
          addOut('Hit:1 http://deb.debian.org/debian bookworm InRelease\nReading package lists... Done\nAll packages are up to date.\n');
        } else {
          addOut(`apt: command '${args[0]}' not recognized`);
        }
        break;
      case 'rm':
        if (args[0] === '-rf' || args[0] === '-r') {
          const target = args[1] || args[0];
          const path = resolvePath(cwd, target);
          if (FILESYSTEM[path]) {
            delete FILESYSTEM[path];
            addOut(`removed directory '${target}'`);
          } else if (FILE_CONTENTS[path]) {
            delete FILE_CONTENTS[path];
            addOut(`removed '${target}'`);
          } else {
            addOut(`rm: cannot remove '${target}': No such file or directory`);
          }
        } else {
          addOut(`rm: missing operand`);
        }
        break;
      case 'systemctl':
        if (args[0] === 'restart') addOut(`Restarting ${args[1] || 'service'}...`);
        else if (args[0] === 'status') addOut(`● ${args[1] || 'service'} - Active: active (running)`);
        else addOut(`systemctl: command '${args[0]}' not recognized`);
        break;
      case 'chmod':
        addOut(args.length >= 2 ? '' : 'chmod: missing operand');
        break;
      case 'chown':
        addOut(args.length >= 2 ? '' : 'chown: missing operand');
        break;
      default:
        addOut(`sudo: ${cmd}: command not found`);
    }
  };

  const runCommand = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      addIn(`${prompt} `);
      return;
    }
    const [cmd, ...args] = trimmed.split(/\s+/);
    addIn(`${prompt} ${trimmed}`);

    if (cmd === 'sudo') {
      const subCmd = args[0];
      const subArgs = args.slice(1);
      if (!subCmd) { addOut('sudo: no command specified'); return; }
      // prompt for password
      setSudoQueue({ cmd: subCmd, args: subArgs });
      setSudoAttempts(0);
      setSudoInput('');
      return;
    }

    if (cmd === 'nano') {
      const filePath = args[0] ? resolvePath(cwd, args[0]) : null;
      if (!filePath) { addOut('nano: no file specified'); return; }
      setNanoFile(filePath);
      setNanoContent(FILE_CONTENTS[filePath] || '');
      setNanoOpen(true);
      return;
    }

    switch (cmd) {
      case 'help':
        addOut('Available commands: ls, cd, pwd, cat, echo, clear, whoami, uname, date, ps, top, ping, git, mkdir, touch, nano, sudo, help, exit');
        break;
      case 'ls': {
        const target = args[0] ? resolvePath(cwd, args[0]) : cwd;
        const entries = FILESYSTEM[target];
        if (!entries) { addOut(`ls: cannot access '${args[0]}': No such file or directory`); break; }
        addOut(entries.length ? entries.join('  ') : '');
        break;
      }
      case 'cd': {
        const target = args[0] ? resolvePath(cwd, args[0]) : '/home/user';
        if (!FILESYSTEM[target]) { addOut(`bash: cd: ${args[0]}: No such file or directory`); break; }
        setCwd(target);
        break;
      }
      case 'pwd':
        addOut(cwd);
        break;
      case 'cat': {
        if (!args[0]) { addOut('cat: missing file operand'); break; }
        const path = resolvePath(cwd, args[0]);
        const content = FILE_CONTENTS[path];
        if (content !== undefined) addOut(content);
        else if (FILESYSTEM[path]) addOut(`cat: ${args[0]}: Is a directory`);
        else addOut(`cat: ${args[0]}: No such file or directory`);
        break;
      }
      case 'echo':
        addOut(args.join(' ').replace(/^["']|["']$/g, ''));
        break;
      case 'clear':
        setHistory([]);
        return;
      case 'whoami':
        addOut('user');
        break;
      case 'uname':
        addOut('Linux thechatbox 6.1.0-18-amd64 #1 SMP Debian x86_64 GNU/Linux');
        break;
      case 'date':
        addOut(new Date().toString());
        break;
      case 'ps':
        addOut('  PID TTY          TIME CMD\n    1 ?        00:00:01 init\n  123 pts/0    00:00:00 bash\n  456 pts/0    00:00:00 node\n  789 pts/0    00:00:00 ps');
        break;
      case 'top':
        addOut('top - Tasks: 42 total, 1 running\n%Cpu(s): 2.1 us, 0.5 sy\nMiB Mem: 7890.2 total, 4200.1 free');
        break;
      case 'ping':
        addOut(args[0]
          ? `PING ${args[0]}: 64 bytes from ${args[0]}: icmp_seq=1 ttl=64 time=12.3 ms\n--- ${args[0]} ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss`
          : 'ping: missing host operand');
        break;
      case 'git':
        if (args[0] === 'status') addOut('On branch main\nnothing to commit, working tree clean');
        else if (args[0] === 'log') addOut('commit a1b2c3d (HEAD -> main)\nAuthor: user <user@thechatbox.dev>\nDate:   Today\n\n    initial commit');
        else if (args[0] === 'clone') addOut(`Cloning into '${(args[1] || 'repo').split('/').pop().replace('.git', '')}'...\nremote: Counting objects: done.\nReceiving objects: 100% done.`);
        else addOut(`git: '${args[0]}' is not a git command. See 'git --help'.`);
        break;
      case 'mkdir': {
        if (!args[0]) { addOut('mkdir: missing operand'); break; }
        const newPath = resolvePath(cwd, args[0]);
        if (FILESYSTEM[newPath]) { addOut(`mkdir: cannot create directory '${args[0]}': File exists`); break; }
        FILESYSTEM[newPath] = [];
        const parent = newPath.substring(0, newPath.lastIndexOf('/')) || '/';
        const name = newPath.split('/').pop();
        if (FILESYSTEM[parent] && !FILESYSTEM[parent].includes(name)) FILESYSTEM[parent].push(name);
        break;
      }
      case 'touch': {
        if (!args[0]) { addOut('touch: missing file operand'); break; }
        const newPath = resolvePath(cwd, args[0]);
        if (FILE_CONTENTS[newPath] === undefined) {
          FILE_CONTENTS[newPath] = '';
          const parent = newPath.substring(0, newPath.lastIndexOf('/')) || '/';
          const name = newPath.split('/').pop();
          if (FILESYSTEM[parent] && !FILESYSTEM[parent].includes(name)) FILESYSTEM[parent].push(name);
        }
        break;
      }
      case 'exit':
        addOut('logout');
        break;
      default:
        addOut(`bash: ${cmd}: command not found`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = input;
      setInput('');
      setHistIdx(-1);
      if (val.trim()) setCmdHistory(h => [val, ...h]);
      runCommand(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? '' : cmdHistory[idx]);
    }
  };

  const handleSudoSubmit = (e) => {
    if (e.key !== 'Enter') return;
    if (sudoInput === SUDO_PASS) {
      setSudoQueue(null);
      setSudoInput('');
      addOut('[sudo] password for user: ');
      executeSudoCommand(sudoQueue.cmd, sudoQueue.args);
    } else {
      const attempts = sudoAttempts + 1;
      setSudoAttempts(attempts);
      if (attempts >= 3) {
        setSudoQueue(null);
        setSudoInput('');
        addOut('Sorry, try again.\nsudo: 3 incorrect password attempts');
      } else {
        addOut(`Sorry, try again.`);
        setSudoInput('');
      }
    }
  };

  const saveNano = () => {
    FILE_CONTENTS[nanoFile] = nanoContent;
    // ensure it's in the fs
    const parent = nanoFile.substring(0, nanoFile.lastIndexOf('/')) || '/';
    const name = nanoFile.split('/').pop();
    if (!FILESYSTEM[parent]) FILESYSTEM[parent] = [];
    if (!FILESYSTEM[parent].includes(name)) FILESYSTEM[parent].push(name);
    setNanoOpen(false);
    addIn(`${prompt} nano ${nanoFile.split('/').pop()}`);
    addOut(`[ File "${nanoFile}" saved ]`);
  };

  // Nano editor UI
  if (nanoOpen) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden font-mono text-xs bg-background">
        {/* Nano top bar */}
        <div className="px-4 py-1 text-center text-[10px] border-b border-border bg-card" style={{ color: '#39FF14' }}>
          GNU nano — {nanoFile}
        </div>
        {/* Editor */}
        <textarea
          ref={nanoRef}
          value={nanoContent}
          onChange={e => setNanoContent(e.target.value)}
          className="flex-1 bg-background text-foreground text-xs p-3 resize-none outline-none border-none font-mono"
          autoFocus
          spellCheck={false}
        />
        {/* Nano bottom bar */}
        <div className="border-t border-border bg-card px-2 py-1 grid grid-cols-4 gap-1 text-[10px]">
          {[
            ['^G', 'Get Help'],
            ['^X', 'Exit'],
            ['^O', 'Write Out (Save)'],
            ['^W', 'Where Is'],
          ].map(([key, label]) => (
            <span key={key} className="flex gap-1">
              <span style={{ color: '#39FF14' }}>{key}</span>
              <span className="text-muted-foreground">{label}</span>
            </span>
          ))}
        </div>
        {/* Keyboard shortcuts handler */}
        <div
          tabIndex={-1}
          className="sr-only"
          onKeyDown={(e) => {
            if ((e.ctrlKey && e.key === 'x') || (e.ctrlKey && e.key === 'X')) { e.preventDefault(); saveNano(); }
            if ((e.ctrlKey && e.key === 'o') || (e.ctrlKey && e.key === 'O')) { e.preventDefault(); saveNano(); }
          }}
        />
        {/* Visible save/exit buttons */}
        <div className="border-t border-border bg-card px-3 py-1.5 flex gap-3">
          <button onClick={saveNano} className="text-[10px] border border-border px-3 py-1 hover:bg-secondary" style={{ color: '#39FF14' }}>
            ^O Save & Exit
          </button>
          <button onClick={() => setNanoOpen(false)} className="text-[10px] border border-border px-3 py-1 hover:bg-secondary text-muted-foreground">
            ^X Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full bg-background overflow-hidden font-mono text-xs cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="border-b border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center gap-2">
        <span className="glow">TERMINAL</span>
        <span>—</span>
        <span>Thechatbox Debian Shell</span>
        <span className="ml-auto text-[9px]">hint: sudo password is "password"</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {history.map((line, i) => (
          <div key={i} className={line.type === 'input' ? 'text-primary glow-subtle' : 'text-foreground'}>
            <pre className="whitespace-pre-wrap break-all">{line.text}</pre>
          </div>
        ))}

        {/* Sudo password prompt */}
        {sudoQueue ? (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">[sudo] password for user:</span>
            <input
              autoFocus
              type="password"
              value={sudoInput}
              onChange={e => setSudoInput(e.target.value)}
              onKeyDown={handleSudoSubmit}
              className="flex-1 bg-transparent outline-none text-primary caret-primary"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-primary glow-subtle flex-shrink-0">{prompt}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-primary caret-primary"
              autoFocus
              spellCheck={false}
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}