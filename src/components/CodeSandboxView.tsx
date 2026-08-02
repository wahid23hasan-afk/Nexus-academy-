import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Code2, 
  Play, 
  RotateCcw, 
  FileCode, 
  Database, 
  Terminal, 
  Download, 
  Sparkles, 
  Copy, 
  Check, 
  Mic, 
  FileText,
  Eye,
  Settings
} from 'lucide-react';

interface CodeSandboxViewProps {
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const HTML_STARTER = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    h1 { color: #58a6ff; margin-bottom: 8px; }
    button {
      background: #238636;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
    button:hover { background: #2ea043; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 NEXUS Code Sandbox</h1>
    <p>Live HTML/CSS/JS Interactive Environment</p>
    <button onclick="greet()">Click Me</button>
  </div>
  <script>
    function greet() {
      alert('Hello Scholar! Your web sandbox is working perfectly.');
    }
  </script>
</body>
</html>`;

const PYTHON_SNIPPETS = [
  {
    title: '1. Binary Search Algorithm',
    code: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print("Index of 23:", binary_search(numbers, 23))`
  },
  {
    title: '2. Fibonacci Series',
    code: `def fibonacci(n):
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print("First 10 Fib numbers:", fibonacci(10))`
  }
];

const SQL_SNIPPETS = [
  {
    title: '1. Course Enrollment Query',
    code: `SELECT 
    students.full_name,
    courses.title AS course_title,
    enrollments.enrolled_at,
    enrollments.status
FROM enrollments
JOIN students ON enrollments.student_id = students.id
JOIN courses ON enrollments.course_id = courses.id
WHERE enrollments.status = 'ACTIVE'
ORDER BY enrollments.enrolled_at DESC;`
  }
];

export function CodeSandboxView({ onShowNotification }: CodeSandboxViewProps) {
  const [activeTab, setActiveTab] = useState<'web' | 'python' | 'sql' | 'notes'>('web');

  // Web Sandbox State
  const [htmlCode, setHtmlCode] = useState<string>(HTML_STARTER);
  const [previewCode, setPreviewCode] = useState<string>(HTML_STARTER);

  // Python/SQL State
  const [selectedPython, setSelectedPython] = useState<number>(0);
  const [pythonOutput, setPythonOutput] = useState<string | null>(null);

  const [selectedSql, setSelectedSql] = useState<number>(0);
  const [sqlResult, setSqlResult] = useState<any[] | null>(null);

  // Notes Scratchpad State
  const [noteTitle, setNoteTitle] = useState<string>('My Science & Coding Scratchpad Notes');
  const [noteBody, setNoteBody] = useState<string>(
    `# Chapter 4 Key Notes
- **Vector Dot Product**: A · B = |A||B| cos(θ)
- **React Hook Rule**: Always call hooks at the top level of function components.
- **SQL INNER JOIN**: Combines rows from two tables when the join condition is met.`
  );
  const [copied, setCopied] = useState<boolean>(false);

  const handleRunWeb = () => {
    setPreviewCode(htmlCode);
    onShowNotification('⚡ Web output re-rendered successfully!', 'success');
  };

  const handleRunPython = () => {
    setPythonOutput('Executing Python kernel...\nOutput:\n' + (selectedPython === 0 ? 'Index of 23: 5' : 'First 10 Fib numbers: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]'));
    onShowNotification('▶️ Python snippet executed successfully.', 'success');
  };

  const handleRunSql = () => {
    setSqlResult([
      { full_name: 'Wahid Hasan', course_title: 'HSC Physics Masterclass', enrolled_at: '2026-08-01', status: 'ACTIVE' },
      { full_name: 'Amina Rahman', course_title: 'Full Stack Web Development', enrolled_at: '2026-08-02', status: 'ACTIVE' }
    ]);
    onShowNotification('📊 SQL Query returned 2 matching records.', 'success');
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(noteBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowNotification('📋 Notes copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Code2 size={12} className="text-purple-400" />
              <span>Interactive Code Sandbox & Scratchpad</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Live Code Editor & Notes Scratchpad
            </h2>
            <p className="text-xs text-slate-300 max-w-xl font-sans">
              Test web code (HTML/CSS/JS), run Python algorithms, execute SQL query simulations, or keep markdown scratchpad notes for your courses.
            </p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('web')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'web' ? 'bg-purple-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode size={14} />
              <span>HTML/JS</span>
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'python' ? 'bg-purple-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal size={14} />
              <span>Python</span>
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'sql' ? 'bg-purple-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database size={14} />
              <span>SQL</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'notes' ? 'bg-purple-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>Scratchpad</span>
            </button>
          </div>
        </div>
      </div>

      {/* Web HTML/CSS/JS Live Sandbox Mode */}
      {activeTab === 'web' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Editor */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col space-y-3 bg-slate-900/90">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono">
              <span className="text-purple-400 font-bold flex items-center space-x-2">
                <FileCode size={14} />
                <span>HTML/CSS/JS Editor</span>
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setHtmlCode(HTML_STARTER)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-slate-300 flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleRunWeb}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer"
                >
                  <Play size={12} />
                  <span>Render Output</span>
                </button>
              </div>
            </div>

            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              className="w-full h-[360px] bg-black/50 border border-white/10 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
            />
          </div>

          {/* Rendered Live Preview Frame */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col space-y-3 bg-slate-900/90">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center space-x-2">
                <Eye size={14} />
                <span>Live Browser Output</span>
              </span>
              <span className="text-[10px] text-slate-500">IFrame Sandbox</span>
            </div>

            <iframe
              title="Web Preview"
              srcDoc={previewCode}
              className="w-full h-[360px] bg-white rounded-xl border border-white/10"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}

      {/* Python Playground Mode */}
      {activeTab === 'python' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 bg-slate-900/90">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-3 text-xs font-mono">
              <Terminal size={16} className="text-amber-400" />
              <span className="font-bold text-white">Python Practice Playground</span>
            </div>

            <button
              onClick={handleRunPython}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Play size={14} />
              <span>Run Python Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300">Select Practice Snippet:</label>
              <select
                value={selectedPython}
                onChange={(e) => setSelectedPython(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              >
                {PYTHON_SNIPPETS.map((s, idx) => (
                  <option key={idx} value={idx} className="bg-slate-900">{s.title}</option>
                ))}
              </select>

              <div className="p-3 bg-black/50 border border-white/10 rounded-xl font-mono text-xs text-amber-300 h-[220px] overflow-auto whitespace-pre">
                {PYTHON_SNIPPETS[selectedPython].code}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300">Execution Console Output:</label>
              <div className="p-3 bg-black border border-white/10 rounded-xl font-mono text-xs text-emerald-400 h-[260px] overflow-auto whitespace-pre">
                {pythonOutput || 'Click "Run Python Code" to execute kernel snippet...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Playground Mode */}
      {activeTab === 'sql' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 bg-slate-900/90">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-3 text-xs font-mono">
              <Database size={16} className="text-cyan-400" />
              <span className="font-bold text-white">SQL Database Query Arena</span>
            </div>

            <button
              onClick={handleRunSql}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Play size={14} />
              <span>Execute SQL Query</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-black/50 border border-white/10 rounded-xl text-cyan-300 leading-relaxed">
              {SQL_SNIPPETS[0].code}
            </div>

            {sqlResult && (
              <div className="space-y-2 pt-2">
                <span className="text-slate-400 text-xs">Query Results Table ({sqlResult.length} rows):</span>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-cyan-400">
                      <tr>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5">Enrolled Course</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {sqlResult.map((r, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 font-bold">{r.full_name}</td>
                          <td className="p-2.5">{r.course_title}</td>
                          <td className="p-2.5 text-slate-400">{r.enrolled_at}</td>
                          <td className="p-2.5 text-emerald-400 font-bold">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Scratchpad Mode */}
      {activeTab === 'notes' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 bg-slate-900/90">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b focus:border-purple-500 font-sans w-2/3"
            />

            <div className="flex space-x-2">
              <button
                onClick={handleCopyNotes}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-slate-300 flex items-center space-x-1.5 cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            rows={10}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed"
            placeholder="Type your lecture notes, formulas, or code snippets here..."
          />
        </div>
      )}
    </div>
  );
}
