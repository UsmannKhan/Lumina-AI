// // 'use client';

// // import React, { useState, useRef, useEffect } from 'react';
// // import ReactMarkdown from 'react-markdown';
// // import { Chat, Message } from '@/types';
// // import { SendIcon, SparklesIcon, UserIcon, FileTextIcon, MenuIcon } from './Icons';
// // import Button from './Button';
// // import clsx from 'clsx';

// // interface ChatViewProps {
// //   chat: Chat;
// //   messages: Message[];
// //   onSendMessage: (input: string) => Promise<void>;
// //   onToggleSidebar: () => void;
// //   isSending: boolean;
// // }

// // export default function ChatView({
// //   chat,
// //   messages,
// //   onSendMessage,
// //   onToggleSidebar,
// //   isSending,
// // }: ChatViewProps) {
// //   const [input, setInput] = useState('');
// //   const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'transcript'>('notes');
// //   const messagesEndRef = useRef<HTMLDivElement>(null);
// //   const inputRef = useRef<HTMLTextAreaElement>(null);

// //   useEffect(() => {
// //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// //   }, [messages]);

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!input.trim() || isSending) return;
    
// //     const message = input;
// //     setInput('');
// //     await onSendMessage(message);
// //   };

// //   const handleKeyDown = (e: React.KeyboardEvent) => {
// //     if (e.key === 'Enter' && !e.shiftKey) {
// //       e.preventDefault();
// //       handleSubmit(e);
// //     }
// //   };

// //   return (
// //     <div className="flex-1 flex flex-col h-screen bg-void-950">
// //       {/* Header */}
// //       <header className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] glass-darker">
// //         <div className="flex items-center justify-between">
// //           <div className="flex items-center gap-4">
// //             <button
// //               onClick={onToggleSidebar}
// //               className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] text-void-400"
// //             >
// //               <MenuIcon size={20} />
// //             </button>
// //             <div>
// //               <h1 className="font-display font-semibold text-lg text-white truncate max-w-md">
// //                 {chat.session_name}
// //               </h1>
// //               <p className="text-xs text-void-500 mt-0.5">
// //                 Video ID: {chat.youtube_id}
// //               </p>
// //             </div>
// //           </div>
          
// //           {/* Tabs */}
// //           <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
// //             {[
// //               { id: 'notes', label: 'Notes', icon: SparklesIcon },
// //               { id: 'chat', label: 'Chat', icon: SendIcon },
// //               { id: 'transcript', label: 'Transcript', icon: FileTextIcon },
// //             ].map((tab) => (
// //               <button
// //                 key={tab.id}
// //                 onClick={() => setActiveTab(tab.id as typeof activeTab)}
// //                 className={clsx(
// //                   'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
// //                   activeTab === tab.id
// //                     ? 'bg-ember-500/20 text-ember-300'
// //                     : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
// //                 )}
// //               >
// //                 <tab.icon size={16} />
// //                 <span className="hidden sm:inline">{tab.label}</span>
// //               </button>
// //             ))}
// //           </div>
// //         </div>
// //       </header>

// //       {/* Main Content */}
// //       <div className="flex-1 flex overflow-hidden">
// //         {/* Video embed */}
// //         <div className="hidden xl:block w-96 flex-shrink-0 p-6 border-r border-white/[0.06]">
// //           <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
// //             <iframe
// //               src={`https://www.youtube.com/embed/${chat.youtube_id}`}
// //               title="YouTube video"
// //               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
// //               allowFullScreen
// //               className="w-full h-full"
// //             />
// //           </div>
          
// //           {/* Quick stats */}
// //           <div className="mt-4 grid grid-cols-2 gap-3">
// //             <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
// //               <p className="text-xs text-void-500 uppercase tracking-wider">Messages</p>
// //               <p className="text-2xl font-display font-bold text-white mt-1">{messages.length}</p>
// //             </div>
// //             <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
// //               <p className="text-xs text-void-500 uppercase tracking-wider">Words</p>
// //               <p className="text-2xl font-display font-bold text-white mt-1">
// //                 {chat.youtube_transcript.split(' ').length.toLocaleString()}
// //               </p>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Content area */}
// //         <div className="flex-1 flex flex-col min-w-0">
// //           {activeTab === 'notes' && (
// //             <div className="flex-1 overflow-y-auto p-6">
// //               <div className="max-w-3xl mx-auto">
// //                 <div className="flex items-center gap-3 mb-6">
// //                   <div className="p-2 rounded-lg bg-ember-500/20">
// //                     <SparklesIcon size={20} className="text-ember-400" />
// //                   </div>
// //                   <h2 className="font-display font-semibold text-xl text-white">AI Analysis</h2>
// //                 </div>
// //                 <div className="markdown-content prose prose-invert max-w-none">
// //                   <ReactMarkdown>{chat.notes}</ReactMarkdown>
// //                 </div>
// //               </div>
// //             </div>
// //           )}

// //           {activeTab === 'transcript' && (
// //             <div className="flex-1 overflow-y-auto p-6">
// //               <div className="max-w-3xl mx-auto">
// //                 <div className="flex items-center gap-3 mb-6">
// //                   <div className="p-2 rounded-lg bg-azure-500/20">
// //                     <FileTextIcon size={20} className="text-azure-400" />
// //                   </div>
// //                   <h2 className="font-display font-semibold text-xl text-white">Full Transcript</h2>
// //                 </div>
// //                 <div className="text-void-300 leading-relaxed whitespace-pre-wrap font-body">
// //                   {chat.youtube_transcript}
// //                 </div>
// //               </div>
// //             </div>
// //           )}

// //           {activeTab === 'chat' && (
// //             <>
// //               {/* Messages */}
// //               <div className="flex-1 overflow-y-auto p-6">
// //                 <div className="max-w-3xl mx-auto space-y-6">
// //                   {messages.length === 0 && (
// //                     <div className="text-center py-16">
// //                       <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ember-500/10 to-ember-600/10 border border-ember-500/20 flex items-center justify-center">
// //                         <SparklesIcon size={36} className="text-ember-400" />
// //                       </div>
// //                       <h3 className="text-xl font-display font-semibold text-white mb-2">
// //                         Ask anything about this video
// //                       </h3>
// //                       <p className="text-void-400 max-w-md mx-auto">
// //                         I've analyzed the transcript and I'm ready to answer your questions, 
// //                         provide summaries, or dive deeper into any topic.
// //                       </p>
                      
// //                       {/* Suggested questions */}
// //                       <div className="mt-8 flex flex-wrap justify-center gap-2">
// //                         {[
// //                           'What are the main takeaways?',
// //                           'Summarize in 3 bullet points',
// //                           'What was the conclusion?',
// //                         ].map((suggestion) => (
// //                           <button
// //                             key={suggestion}
// //                             onClick={() => setInput(suggestion)}
// //                             className="px-4 py-2 rounded-full text-sm text-void-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
// //                           >
// //                             {suggestion}
// //                           </button>
// //                         ))}
// //                       </div>
// //                     </div>
// //                   )}

// //                   {messages.map((message, index) => (
// //                     <div key={message.id} className="space-y-4 animate-fade-in">
// //                       {/* User message */}
// //                       <div className="flex gap-4">
// //                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-azure-500/20 flex items-center justify-center">
// //                           <UserIcon size={18} className="text-azure-400" />
// //                         </div>
// //                         <div className="flex-1 pt-2">
// //                           <p className="text-void-100">{message.input}</p>
// //                         </div>
// //                       </div>
                      
// //                       {/* AI response */}
// //                       <div className="flex gap-4">
// //                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
// //                           <SparklesIcon size={18} className="text-ember-400" />
// //                         </div>
// //                         <div className="flex-1 pt-2">
// //                           <div className="markdown-content">
// //                             <ReactMarkdown>{message.output}</ReactMarkdown>
// //                           </div>
// //                         </div>
// //                       </div>
// //                     </div>
// //                   ))}

// //                   {isSending && (
// //                     <div className="flex gap-4 animate-fade-in">
// //                       <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
// //                         <SparklesIcon size={18} className="text-ember-400" />
// //                       </div>
// //                       <div className="flex-1 pt-2">
// //                         <div className="typing-indicator">
// //                           <span />
// //                           <span />
// //                           <span />
// //                         </div>
// //                       </div>
// //                     </div>
// //                   )}

// //                   <div ref={messagesEndRef} />
// //                 </div>
// //               </div>

// //               {/* Input */}
// //               <div className="flex-shrink-0 p-6 border-t border-white/[0.06] glass-darker">
// //                 <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
// //                   <div className="relative">
// //                     <textarea
// //                       ref={inputRef}
// //                       value={input}
// //                       onChange={(e) => setInput(e.target.value)}
// //                       onKeyDown={handleKeyDown}
// //                       placeholder="Ask a question about the video..."
// //                       rows={1}
// //                       className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 pr-14 text-void-100 placeholder:text-void-500 resize-none transition-all focus:outline-none focus:border-ember-500/50 focus:bg-white/[0.05] hover:border-white/[0.15]"
// //                       style={{ minHeight: '56px', maxHeight: '200px' }}
// //                     />
// //                     <Button
// //                       type="submit"
// //                       variant="primary"
// //                       size="sm"
// //                       disabled={!input.trim() || isSending}
// //                       className="absolute right-2 bottom-2 !rounded-xl !p-2.5"
// //                     >
// //                       <SendIcon size={18} />
// //                     </Button>
// //                   </div>
// //                 </form>
// //               </div>
// //             </>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }



// 'use client';

// import React, { useState, useRef, useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
// import html2canvas from 'html2canvas';
// import { jsPDF } from 'jspdf';
// import { Chat, Message } from '@/types';
// import { SendIcon, SparklesIcon, UserIcon, FileTextIcon, MenuIcon, ClockIcon, HashIcon } from './Icons';
// import Button from './Button';
// import clsx from 'clsx';
// import { DownloadIcon } from 'lucide-react';

// interface ChatViewProps {
//   chat: Chat;
//   messages: Message[];
//   onSendMessage: (input: string) => Promise<void>;
//   onToggleSidebar: () => void;
//   isSending: boolean;
// }

// // Helper function to estimate video duration from transcript
// function estimateReadingTime(text: string): string {
//   const words = text.split(/\s+/).length;
//   // Average speaking rate is ~150 words per minute
//   const minutes = Math.ceil(words / 150);
//   if (minutes < 60) {
//     return `~${minutes} min`;
//   }
//   const hours = Math.floor(minutes / 60);
//   const remainingMins = minutes % 60;
//   return `~${hours}h ${remainingMins}m`;
// }

// // Helper function to count main detailed sections from notes
// function countSections(notes: string): number {
//   // Count h3 headers (###) which are the numbered detailed sections
//   const detailedSections = (notes.match(/^###\s/gm) || []).length;
//   return Math.max(1, detailedSections);
// }

// export default function ChatView({
//   chat,
//   messages,
//   onSendMessage,
//   onToggleSidebar,
//   isSending,
// }: ChatViewProps) {
//   const [input, setInput] = useState('');
//   const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'transcript'>('notes');
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLTextAreaElement>(null);

//   // Calculate stats
//   const wordCount = chat.youtube_transcript.split(/\s+/).length;
//   const estimatedDuration = estimateReadingTime(chat.youtube_transcript);
//   const sectionCount = countSections(chat.notes);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!input.trim() || isSending) return;
    
//     const message = input;
//     setInput('');
//     await onSendMessage(message);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSubmit(e);
//     }
//   };

// // const handleExportMarkdown = () => {
// //   const content = `# ${chat.session_name}\n\n${chat.notes}`;
// //   const blob = new Blob([content], { type: 'text/markdown' });
// //   const url = URL.createObjectURL(blob);
// //   const a = document.createElement('a');
// //   a.href = url;
// //   a.download = `${chat.session_name}.md`;
// //   a.click();
// // };

// // Replace your handleExportPDF with this:

// const handleExportPDF = () => {
//   const pdf = new jsPDF();
//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const margin = 20;
//   const maxWidth = pageWidth - margin * 2;
//   let y = 20;

//   // Check if we need a new page
//   const checkPage = (needed: number) => {
//     if (y + needed > 280) {
//       pdf.addPage();
//       y = 20;
//     }
//   };

//   // Add wrapped text
//   const addText = (text: string, fontSize: number, isBold = false, indent = 0) => {
//     pdf.setFontSize(fontSize);
//     pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    
//     const lines = pdf.splitTextToSize(text, maxWidth - indent);
    
//     for (const line of lines) {
//       checkPage(fontSize * 0.5);
//       pdf.text(line, margin + indent, y);
//       y += fontSize * 0.45;
//     }
//   };

//   // Title
//   pdf.setFontSize(22);
//   pdf.setFont('helvetica', 'bold');
//   const titleLines = pdf.splitTextToSize(chat.session_name, maxWidth);
//   for (const line of titleLines) {
//     pdf.text(line, margin, y);
//     y += 9;
//   }
//   y += 2;
  
//   // Video ID
//   pdf.setFontSize(10);
//   pdf.setFont('helvetica', 'normal');
//   pdf.setTextColor(120);
//   pdf.text(`Video ID: ${chat.youtube_id}`, margin, y);
//   pdf.setTextColor(0);
//   y += 12;

//   // Divider line
//   pdf.setDrawColor(200);
//   pdf.line(margin, y, pageWidth - margin, y);
//   y += 10;

//   // Process notes
//   const lines = chat.notes.split('\n');
  
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
    
//     // Skip empty lines but add spacing
//     if (!line.trim()) {
//       y += 3;
//       continue;
//     }

//     // Clean markdown from text
//     const cleanText = (text: string) => {
//       return text
//         .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
//         .replace(/\*(.*?)\*/g, '$1')       // Remove *italic*
//         .replace(/`(.*?)`/g, '$1')         // Remove `code`
//         .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove [links](url)
//         .trim();
//     };

//     // H1 Header
//     if (line.startsWith('# ')) {
//       checkPage(15);
//       y += 6;
//       addText(cleanText(line.replace('# ', '')), 18, true);
//       y += 4;
//     }
//     // H2 Header
//     else if (line.startsWith('## ')) {
//       checkPage(12);
//       y += 5;
//       addText(cleanText(line.replace('## ', '')), 14, true);
//       y += 3;
//     }
//     // H3 Header
//     else if (line.startsWith('### ')) {
//       checkPage(10);
//       y += 4;
//       addText(cleanText(line.replace('### ', '')), 12, true);
//       y += 2;
//     }
//     // H4 Header
//     else if (line.startsWith('#### ')) {
//       checkPage(10);
//       y += 3;
//       addText(cleanText(line.replace('#### ', '')), 11, true);
//       y += 2;
//     }
//     // Horizontal rule
//     else if (line.startsWith('---')) {
//       checkPage(10);
//       y += 4;
//       pdf.setDrawColor(220);
//       pdf.line(margin, y, pageWidth - margin, y);
//       y += 6;
//     }
//     // Bullet points (-, *, •)
//     else if (line.match(/^[\s]*[-*•]\s/)) {
//       checkPage(8);
//       const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2;
//       const text = cleanText(line.replace(/^[\s]*[-*•]\s/, ''));
      
//       pdf.setFontSize(10);
//       pdf.setFont('helvetica', 'normal');
//       pdf.text('•', margin + (indent * 5), y);
      
//       const bulletLines = pdf.splitTextToSize(text, maxWidth - 8 - (indent * 5));
//       for (let j = 0; j < bulletLines.length; j++) {
//         if (j > 0) checkPage(5);
//         pdf.text(bulletLines[j], margin + 6 + (indent * 5), y);
//         y += 5;
//       }
//     }
//     // Numbered list
//     else if (line.match(/^\d+\.\s/)) {
//       checkPage(8);
//       const num = line.match(/^(\d+)\./)?.[1] || '1';
//       const text = cleanText(line.replace(/^\d+\.\s/, ''));
      
//       pdf.setFontSize(10);
//       pdf.setFont('helvetica', 'normal');
//       pdf.text(`${num}.`, margin, y);
      
//       const numLines = pdf.splitTextToSize(text, maxWidth - 10);
//       for (let j = 0; j < numLines.length; j++) {
//         if (j > 0) checkPage(5);
//         pdf.text(numLines[j], margin + 8, y);
//         y += 5;
//       }
//     }
//     // Regular paragraph
//     else {
//       checkPage(8);
//       addText(cleanText(line), 10, false);
//       y += 1;
//     }
//   }

//   // Save with clean filename
//   const filename = chat.session_name
//     .replace(/[^a-z0-9\s]/gi, '')
//     .replace(/\s+/g, '_')
//     .substring(0, 50) || 'notes';
  
//   pdf.save(`${filename}.pdf`);
// };

//   return (
//     <div className="flex-1 flex flex-col h-screen bg-void-950">
//       {/* Header */}
//       <header className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] glass-darker">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <button
//               onClick={onToggleSidebar}
//               className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] text-void-400"
//             >
//               <MenuIcon size={20} />
//             </button>
//             <div>
//               <h1 className="font-display font-semibold text-lg text-white truncate max-w-md">
//                 {chat.session_name}
//               </h1>
//               <p className="text-xs text-void-500 mt-0.5">
//                 Video ID: {chat.youtube_id}
//               </p>
//             </div>
//           </div>
          
//           {/* Tabs */}
//           <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
//             {[
//               { id: 'notes', label: 'Notes', icon: SparklesIcon },
//               { id: 'chat', label: 'Chat', icon: SendIcon },
//               { id: 'transcript', label: 'Transcript', icon: FileTextIcon },
//             ].map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id as typeof activeTab)}
//                 className={clsx(
//                   'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
//                   activeTab === tab.id
//                     ? 'bg-ember-500/20 text-ember-300'
//                     : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
//                 )}
//               >
//                 <tab.icon size={16} />
//                 <span className="hidden sm:inline">{tab.label}</span>
//               </button>
//             ))}
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Video embed */}
//         <div className="hidden xl:block w-96 flex-shrink-0 p-6 border-r border-white/[0.06]">
//           <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
//             <iframe
//               src={`https://www.youtube.com/embed/${chat.youtube_id}`}
//               title="YouTube video"
//               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//               allowFullScreen
//               className="w-full h-full"
//             />
//           </div>
          
//           {/* Improved stats */}
//           <div className="mt-4 space-y-3">
//             {/* Primary stats row */}
//             <div className="grid grid-cols-2 gap-3">
//               <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
//                 <div className="flex items-center gap-2 mb-1">
//                   <ClockIcon size={12} className="text-void-500" />
//                   <p className="text-xs text-void-500 uppercase tracking-wider">Duration</p>
//                 </div>
//                 <p className="text-xl font-display font-bold text-white">{estimatedDuration}</p>
//               </div>
//               <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
//                 <div className="flex items-center gap-2 mb-1">
//                   <HashIcon size={12} className="text-void-500" />
//                   <p className="text-xs text-void-500 uppercase tracking-wider">Sections</p>
//                 </div>
//                 <p className="text-xl font-display font-bold text-white">{sectionCount}</p>
//               </div>
//             </div>
            
//             {/* Word count bar */}
//             <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
//               <div className="flex items-center justify-between mb-2">
//                 <p className="text-xs text-void-500 uppercase tracking-wider">Transcript Length</p>
//                 <p className="text-sm font-semibold text-white">{wordCount.toLocaleString()} words</p>
//               </div>
//               <div className="h-1.5 bg-void-800 rounded-full overflow-hidden">
//                 <div 
//                   className="h-full bg-gradient-to-r from-ember-500 to-ember-400 rounded-full transition-all"
//                   style={{ width: `${Math.min((wordCount / 10000) * 100, 100)}%` }}
//                 />
//               </div>
//               <p className="text-xs text-void-600 mt-1.5">
//                 {wordCount < 1000 ? 'Short video' : wordCount < 5000 ? 'Medium length' : 'Long video'}
//               </p>
//             </div>

//             {/* Chat activity */}
//             <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
//               <div className="flex items-center justify-between">
//                 <p className="text-xs text-void-500 uppercase tracking-wider">Chat Messages</p>
//                 <p className="text-sm font-semibold text-white">{messages.length}</p>
//               </div>
//               {messages.length === 0 && (
//                 <p className="text-xs text-void-600 mt-1">Start a conversation about this video</p>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Content area */}
//         <div className="flex-1 flex flex-col min-w-0">
//           {activeTab === 'notes' && (
//             <div className="flex-1 overflow-y-auto p-6">
//               <div className="max-w-3xl mx-auto">
//                 <div className="flex items-center justify-between gap-3 mb-6">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 rounded-lg bg-ember-500/20">
//                       <SparklesIcon size={20} className="text-ember-400" />
//                     </div>
//                     <h2 className="font-display font-semibold text-xl text-white">AI Analysis</h2>
//                   </div>
//                   <Button onClick={handleExportPDF} variant="ghost" size="sm">
//                     <DownloadIcon size={16} />
//                     Export
//                   </Button>
//                 </div>
//                 <div className="markdown-content prose prose-invert max-w-none">
//                   <ReactMarkdown>{chat.notes}</ReactMarkdown>
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === 'transcript' && (
//             <div className="flex-1 overflow-y-auto p-6">
//               <div className="max-w-3xl mx-auto">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="p-2 rounded-lg bg-azure-500/20">
//                     <FileTextIcon size={20} className="text-azure-400" />
//                   </div>
//                   <h2 className="font-display font-semibold text-xl text-white">Full Transcript</h2>
//                 </div>
//                 <div className="text-void-300 leading-relaxed whitespace-pre-wrap font-body">
//                   {chat.youtube_transcript}
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === 'chat' && (
//             <>
//               {/* Messages */}
//               <div className="flex-1 overflow-y-auto p-6">
//                 <div className="max-w-3xl mx-auto space-y-6">
//                   {messages.length === 0 && (
//                     <div className="text-center py-16">
//                       <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ember-500/10 to-ember-600/10 border border-ember-500/20 flex items-center justify-center">
//                         <SparklesIcon size={36} className="text-ember-400" />
//                       </div>
//                       <h3 className="text-xl font-display font-semibold text-white mb-2">
//                         Ask anything about this video
//                       </h3>
//                       <p className="text-void-400 max-w-md mx-auto">
//                         I've analyzed the transcript and I'm ready to answer your questions, 
//                         provide summaries, or dive deeper into any topic.
//                       </p>
                      
//                       {/* Suggested questions */}
//                       <div className="mt-8 flex flex-wrap justify-center gap-2">
//                         {[
//                           'What are the main takeaways?',
//                           'Summarize in 3 bullet points',
//                           'What was the conclusion?',
//                         ].map((suggestion) => (
//                           <button
//                             key={suggestion}
//                             onClick={() => setInput(suggestion)}
//                             className="px-4 py-2 rounded-full text-sm text-void-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
//                           >
//                             {suggestion}
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {messages.map((message, index) => (
//                     <div key={message.id} className="space-y-4 animate-fade-in">
//                       {/* User message */}
//                       <div className="flex gap-4">
//                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-azure-500/20 flex items-center justify-center">
//                           <UserIcon size={18} className="text-azure-400" />
//                         </div>
//                         <div className="flex-1 pt-2">
//                           <p className="text-void-100">{message.input}</p>
//                         </div>
//                       </div>
                      
//                       {/* AI response */}
//                       <div className="flex gap-4">
//                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
//                           <SparklesIcon size={18} className="text-ember-400" />
//                         </div>
//                         <div className="flex-1 pt-2">
//                           <div className="markdown-content">
//                             <ReactMarkdown>{message.output}</ReactMarkdown>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}

//                   {isSending && (
//                     <div className="flex gap-4 animate-fade-in">
//                       <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
//                         <SparklesIcon size={18} className="text-ember-400" />
//                       </div>
//                       <div className="flex-1 pt-2">
//                         <div className="typing-indicator">
//                           <span />
//                           <span />
//                           <span />
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   <div ref={messagesEndRef} />
//                 </div>
//               </div>

//               {/* Input */}
//               <div className="flex-shrink-0 p-6 border-t border-white/[0.06] glass-darker">
//                 <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
//                   <div className="flex items-center gap-3">
//                     <div className="flex-1 relative">
//                       <textarea
//                         ref={inputRef}
//                         value={input}
//                         onChange={(e) => setInput(e.target.value)}
//                         onKeyDown={handleKeyDown}
//                         placeholder="Ask a question about the video..."
//                         rows={1}
//                         className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-void-100 placeholder:text-void-500 resize-none transition-all focus:outline-none focus:border-ember-500/50 focus:bg-white/[0.05] hover:border-white/[0.15]"
//                         style={{ minHeight: '56px', maxHeight: '200px' }}
//                       />
//                     </div>
//                     <Button
//                       type="submit"
//                       variant="primary"
//                       size="sm"
//                       disabled={!input.trim() || isSending}
//                       className="!rounded-xl !p-4 flex-shrink-0 mb-1"
//                     >
//                       {isSending ? (
//                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                       ) : (
//                         <SendIcon size={20} />
//                       )}
//                     </Button>
//                   </div>
//                 </form>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// 'use client';

// import React, { useState, useRef, useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
// import { jsPDF } from 'jspdf';
// import { Chat, Message } from '@/types';
// import { SendIcon, SparklesIcon, UserIcon, FileTextIcon, MenuIcon } from './Icons';
// import Button from './Button';
// import clsx from 'clsx';
// import { DownloadIcon, Maximize2, Minimize2, Copy, Check } from 'lucide-react';

// interface ChatViewProps {
//   chat: Chat;
//   messages: Message[];
//   onSendMessage: (input: string) => Promise<void>;
//   onToggleSidebar: () => void;
//   isSending: boolean;
// }

// export default function ChatView({
//   chat,
//   messages,
//   onSendMessage,
//   onToggleSidebar,
//   isSending,
// }: ChatViewProps) {
//   const [input, setInput] = useState('');
//   const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'transcript'>('notes');
//   const [isVideoExpanded, setIsVideoExpanded] = useState(false);
//   const [isCopied, setIsCopied] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLTextAreaElement>(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!input.trim() || isSending) return;
    
//     const message = input;
//     setInput('');
//     await onSendMessage(message);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSubmit(e);
//     }
//   };

//   const handleExportPDF = () => {
//     const pdf = new jsPDF();
//     const pageWidth = pdf.internal.pageSize.getWidth();
//     const margin = 20;
//     const maxWidth = pageWidth - margin * 2;
//     let y = 20;

//     const checkPage = (needed: number) => {
//       if (y + needed > 280) {
//         pdf.addPage();
//         y = 20;
//       }
//     };

//     const addText = (text: string, fontSize: number, isBold = false, indent = 0) => {
//       pdf.setFontSize(fontSize);
//       pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
//       const lines = pdf.splitTextToSize(text, maxWidth - indent);
//       for (const line of lines) {
//         checkPage(fontSize * 0.5);
//         pdf.text(line, margin + indent, y);
//         y += fontSize * 0.45;
//       }
//     };

//     // Title
//     pdf.setFontSize(22);
//     pdf.setFont('helvetica', 'bold');
//     const titleLines = pdf.splitTextToSize(chat.session_name, maxWidth);
//     for (const line of titleLines) {
//       pdf.text(line, margin, y);
//       y += 9;
//     }
//     y += 2;
    
//     // Video ID
//     pdf.setFontSize(10);
//     pdf.setFont('helvetica', 'normal');
//     pdf.setTextColor(120);
//     pdf.text(`Video ID: ${chat.youtube_id}`, margin, y);
//     pdf.setTextColor(0);
//     y += 12;

//     // Divider
//     pdf.setDrawColor(200);
//     pdf.line(margin, y, pageWidth - margin, y);
//     y += 10;

//     // Process notes
//     const lines = chat.notes.split('\n');
    
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i];
      
//       if (!line.trim()) {
//         y += 3;
//         continue;
//       }

//       const cleanText = (text: string) => {
//         return text
//           .replace(/\*\*(.*?)\*\*/g, '$1')
//           .replace(/\*(.*?)\*/g, '$1')
//           .replace(/`(.*?)`/g, '$1')
//           .replace(/\[(.*?)\]\(.*?\)/g, '$1')
//           .trim();
//       };

//       if (line.startsWith('# ')) {
//         checkPage(15);
//         y += 6;
//         addText(cleanText(line.replace('# ', '')), 18, true);
//         y += 4;
//       } else if (line.startsWith('## ')) {
//         checkPage(12);
//         y += 5;
//         addText(cleanText(line.replace('## ', '')), 14, true);
//         y += 3;
//       } else if (line.startsWith('### ')) {
//         checkPage(10);
//         y += 4;
//         addText(cleanText(line.replace('### ', '')), 12, true);
//         y += 2;
//       } else if (line.startsWith('#### ')) {
//         checkPage(10);
//         y += 3;
//         addText(cleanText(line.replace('#### ', '')), 11, true);
//         y += 2;
//       } else if (line.startsWith('---')) {
//         checkPage(10);
//         y += 4;
//         pdf.setDrawColor(220);
//         pdf.line(margin, y, pageWidth - margin, y);
//         y += 6;
//       } else if (line.match(/^[\s]*[-*•]\s/)) {
//         checkPage(8);
//         const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2;
//         const text = cleanText(line.replace(/^[\s]*[-*•]\s/, ''));
//         pdf.setFontSize(10);
//         pdf.setFont('helvetica', 'normal');
//         pdf.text('•', margin + (indent * 5), y);
//         const bulletLines = pdf.splitTextToSize(text, maxWidth - 8 - (indent * 5));
//         for (let j = 0; j < bulletLines.length; j++) {
//           if (j > 0) checkPage(5);
//           pdf.text(bulletLines[j], margin + 6 + (indent * 5), y);
//           y += 5;
//         }
//       } else if (line.match(/^\d+\.\s/)) {
//         checkPage(8);
//         const num = line.match(/^(\d+)\./)?.[1] || '1';
//         const text = cleanText(line.replace(/^\d+\.\s/, ''));
//         pdf.setFontSize(10);
//         pdf.setFont('helvetica', 'normal');
//         pdf.text(`${num}.`, margin, y);
//         const numLines = pdf.splitTextToSize(text, maxWidth - 10);
//         for (let j = 0; j < numLines.length; j++) {
//           if (j > 0) checkPage(5);
//           pdf.text(numLines[j], margin + 8, y);
//           y += 5;
//         }
//       } else {
//         checkPage(8);
//         addText(cleanText(line), 10, false);
//         y += 1;
//       }
//     }

//     const filename = chat.session_name
//       .replace(/[^a-z0-9\s]/gi, '')
//       .replace(/\s+/g, '_')
//       .substring(0, 50) || 'notes';
    
//     pdf.save(`${filename}.pdf`);
//   };

//   const handleCopyNotes = async () => {
//     try {
//       let plainText = chat.notes;

//       // Remove code blocks
//       plainText = plainText.replace(/```[\s\S]*?```/g, '');
//       plainText = plainText.replace(/`([^`]+)`/g, '$1');

//       // Remove headers (must be done before other replacements)
//       plainText = plainText.replace(/^#{1,6}\s+/gm, '');

//       // Remove bold and italic
//       plainText = plainText.replace(/\*\*\*(.+?)\*\*\*/g, '$1'); // Bold+italic
//       plainText = plainText.replace(/\*\*(.+?)\*\*/g, '$1');     // Bold
//       plainText = plainText.replace(/\*(.+?)\*/g, '$1');         // Italic
//       plainText = plainText.replace(/___(.+?)___/g, '$1');       // Bold+italic
//       plainText = plainText.replace(/__(.+?)__/g, '$1');         // Bold
//       plainText = plainText.replace(/_(.+?)_/g, '$1');           // Italic

//       // Remove links but keep link text
//       plainText = plainText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
      
//       // Remove images
//       plainText = plainText.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');

//       // Remove horizontal rules
//       plainText = plainText.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '');

//       // Convert bullet points to simple dashes (preserve structure)
//       plainText = plainText.replace(/^\s*[\*\+\-]\s+/gm, '- ');
      
//       // Convert numbered lists to simple format
//       plainText = plainText.replace(/^\s*\d+\.\s+/gm, '');

//       // Remove blockquotes
//       plainText = plainText.replace(/^\s*>\s+/gm, '');

//       // Remove HTML tags
//       plainText = plainText.replace(/<[^>]+>/g, '');

//       // Clean up excessive whitespace but preserve paragraph breaks
//       plainText = plainText.replace(/\n{3,}/g, '\n\n');
//       plainText = plainText.replace(/[ \t]+/g, ' ');
      
//       // Trim each line
//       plainText = plainText.split('\n').map(line => line.trim()).join('\n');
      
//       // Final trim
//       plainText = plainText.trim();

//       await navigator.clipboard.writeText(plainText);
//       setIsCopied(true);
//       setTimeout(() => setIsCopied(false), 2000);
//     } catch (err) {
//       console.error('Failed to copy:', err);
//     }
//   };

//   return (
//     <div className="flex-1 flex flex-col h-screen bg-void-950">
//       {/* Header */}
//       <header className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] glass-darker">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <button
//               onClick={onToggleSidebar}
//               className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] text-void-400"
//             >
//               <MenuIcon size={20} />
//             </button>
//             <div>
//               <h1 className="font-display font-semibold text-lg text-white truncate max-w-md">
//                 {chat.session_name}
//               </h1>
//               <p className="text-xs text-void-500 mt-0.5">
//                 Video ID: {chat.youtube_id}
//               </p>
//             </div>
//           </div>
          
//           {/* Tabs */}
//           <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
//             {[
//               { id: 'notes', label: 'Notes', icon: SparklesIcon },
//               { id: 'chat', label: 'Chat', icon: SendIcon },
//               { id: 'transcript', label: 'Transcript', icon: FileTextIcon },
//             ].map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id as typeof activeTab)}
//                 className={clsx(
//                   'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
//                   activeTab === tab.id
//                     ? 'bg-ember-500/20 text-ember-300'
//                     : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
//                 )}
//               >
//                 <tab.icon size={16} />
//                 <span className="hidden sm:inline">{tab.label}</span>
//               </button>
//             ))}
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Video Panel */}
//         <div 
//           className={clsx(
//             "hidden xl:flex flex-col flex-shrink-0 border-r border-white/[0.06] transition-all duration-300",
//             isVideoExpanded ? "w-[600px]" : "w-96"
//           )}
//         >
//           {/* Video Container */}
//           <div className="p-4 flex-1 flex flex-col">
//             <div className="relative group flex-1">
//               <div className="rounded-xl overflow-hidden bg-black shadow-2xl h-full">
//                 <iframe
//                   src={`https://www.youtube.com/embed/${chat.youtube_id}`}
//                   title="YouTube video"
//                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                   allowFullScreen
//                   className="w-full h-full min-h-[200px]"
//                   style={{ aspectRatio: isVideoExpanded ? '16/9' : 'auto' }}
//                 />
//               </div>
              
//               {/* Expand/Collapse Button */}
//               <button
//                 onClick={() => setIsVideoExpanded(!isVideoExpanded)}
//                 className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
//                 title={isVideoExpanded ? "Collapse video" : "Expand video"}
//               >
//                 {isVideoExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
//               </button>
//             </div>
            
//             {/* Minimal info */}
//             <p className="text-xs text-void-500 mt-3 text-center">
//               {chat.youtube_transcript.split(/\s+/).length.toLocaleString()} words • {messages.length} messages
//             </p>
//           </div>
//         </div>

//         {/* Content area */}
//         <div className="flex-1 flex flex-col min-w-0">
//           {activeTab === 'notes' && (
//             <div className="flex-1 overflow-y-auto p-6">
//               <div className="max-w-3xl mx-auto">
//                 <div className="flex items-center justify-between gap-3 mb-6">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 rounded-lg bg-ember-500/20">
//                       <SparklesIcon size={20} className="text-ember-400" />
//                     </div>
//                     <h2 className="font-display font-semibold text-xl text-white">Analysis</h2>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <Button onClick={handleCopyNotes} variant="ghost" size="sm" title="Copy notes to clipboard">
//                       {isCopied ? <Check size={16} /> : <Copy size={16} />}
//                       {isCopied ? 'Copied' : 'Copy'}
//                     </Button>
//                     <Button onClick={handleExportPDF} variant="ghost" size="sm">
//                       <DownloadIcon size={16} />
//                       Export
//                     </Button>
//                   </div>
//                 </div>
//                 <div className="markdown-content prose prose-invert max-w-none">
//                   <ReactMarkdown>{chat.notes}</ReactMarkdown>
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === 'transcript' && (
//             <div className="flex-1 overflow-y-auto p-6">
//               <div className="max-w-3xl mx-auto">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="p-2 rounded-lg bg-azure-500/20">
//                     <FileTextIcon size={20} className="text-azure-400" />
//                   </div>
//                   <h2 className="font-display font-semibold text-xl text-white">Full Transcript</h2>
//                 </div>
//                 <div className="text-void-300 leading-relaxed whitespace-pre-wrap font-body">
//                   {chat.youtube_transcript}
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === 'chat' && (
//             <>
//               {/* Messages */}
//               <div className="flex-1 overflow-y-auto p-6">
//                 <div className="max-w-3xl mx-auto space-y-6">
//                   {messages.length === 0 && (
//                     <div className="text-center py-16">
//                       <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ember-500/10 to-ember-600/10 border border-ember-500/20 flex items-center justify-center">
//                         <SparklesIcon size={36} className="text-ember-400" />
//                       </div>
//                       <h3 className="text-xl font-display font-semibold text-white mb-2">
//                         Ask anything about this video
//                       </h3>
//                       <p className="text-void-400 max-w-md mx-auto">
//                         I've analyzed the transcript and I'm ready to answer your questions, 
//                         provide summaries, or dive deeper into any topic.
//                       </p>
                      
//                       {/* Suggested questions */}
//                       <div className="mt-8 flex flex-wrap justify-center gap-2">
//                         {[
//                           'What are the main takeaways?',
//                           'Summarize in 3 bullet points',
//                           'What was the conclusion?',
//                         ].map((suggestion) => (
//                           <button
//                             key={suggestion}
//                             onClick={() => setInput(suggestion)}
//                             className="px-4 py-2 rounded-full text-sm text-void-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
//                           >
//                             {suggestion}
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {messages.map((message) => (
//                     <div key={message.id} className="space-y-4 animate-fade-in">
//                       {/* User message */}
//                       <div className="flex gap-4">
//                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-azure-500/20 flex items-center justify-center">
//                           <UserIcon size={18} className="text-azure-400" />
//                         </div>
//                         <div className="flex-1 pt-2">
//                           <p className="text-void-100">{message.input}</p>
//                         </div>
//                       </div>
                      
//                       {/* AI response */}
//                       <div className="flex gap-4">
//                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
//                           <SparklesIcon size={18} className="text-ember-400" />
//                         </div>
//                         <div className="flex-1 pt-2">
//                           <div className="markdown-content">
//                             <ReactMarkdown>{message.output}</ReactMarkdown>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}

//                   {isSending && (
//                     <div className="flex gap-4 animate-fade-in">
//                       <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
//                         <SparklesIcon size={18} className="text-ember-400" />
//                       </div>
//                       <div className="flex-1 pt-2">
//                         <div className="typing-indicator">
//                           <span />
//                           <span />
//                           <span />
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   <div ref={messagesEndRef} />
//                 </div>
//               </div>

//               {/* Input */}
//               <div className="flex-shrink-0 p-6 border-t border-white/[0.06] glass-darker">
//                 <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
//                   <div className="flex items-center gap-3">
//                     <div className="flex-1 relative">
//                       <textarea
//                         ref={inputRef}
//                         value={input}
//                         onChange={(e) => setInput(e.target.value)}
//                         onKeyDown={handleKeyDown}
//                         placeholder="Ask a question about the video..."
//                         rows={1}
//                         className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-void-100 placeholder:text-void-500 resize-none transition-all focus:outline-none focus:border-ember-500/50 focus:bg-white/[0.05] hover:border-white/[0.15]"
//                         style={{ minHeight: '56px', maxHeight: '200px' }}
//                       />
//                     </div>
//                     <Button
//                       type="submit"
//                       variant="primary"
//                       size="sm"
//                       disabled={!input.trim() || isSending}
//                       className="!rounded-xl !p-4 flex-shrink-0 mb-1"
//                     >
//                       {isSending ? (
//                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                       ) : (
//                         <SendIcon size={20} />
//                       )}
//                     </Button>
//                   </div>
//                 </form>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


// 'use client';

// import React, { useState, useRef, useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
// import { jsPDF } from 'jspdf';
// import { Chat, Message } from '@/types';
// import { SendIcon, SparklesIcon, UserIcon, FileTextIcon, MenuIcon } from './Icons';
// import Button from './Button';
// import FlashcardsView from './FlashcardsView';
// import clsx from 'clsx';
// import { DownloadIcon, Maximize2, Minimize2, BookOpen } from 'lucide-react';

// interface ChatViewProps {
//   chat: Chat;
//   messages: Message[];
//   onSendMessage: (input: string) => Promise<void>;
//   onToggleSidebar: () => void;
//   isSending: boolean;
// }

// export default function ChatView({
//   chat,
//   messages,
//   onSendMessage,
//   onToggleSidebar,
//   isSending,
// }: ChatViewProps) {
//   const [input, setInput] = useState('');
//   const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'transcript' | 'flashcards'>('notes');
//   const [isVideoExpanded, setIsVideoExpanded] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLTextAreaElement>(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!input.trim() || isSending) return;
    
//     const message = input;
//     setInput('');
//     await onSendMessage(message);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSubmit(e);
//     }
//   };

//   const handleExportPDF = () => {
//     const pdf = new jsPDF();
//     const pageWidth = pdf.internal.pageSize.getWidth();
//     const margin = 20;
//     const maxWidth = pageWidth - margin * 2;
//     let y = 20;

//     const checkPage = (needed: number) => {
//       if (y + needed > 280) {
//         pdf.addPage();
//         y = 20;
//       }
//     };

//     const addText = (text: string, fontSize: number, isBold = false, indent = 0) => {
//       pdf.setFontSize(fontSize);
//       pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
//       const lines = pdf.splitTextToSize(text, maxWidth - indent);
//       for (const line of lines) {
//         checkPage(fontSize * 0.5);
//         pdf.text(line, margin + indent, y);
//         y += fontSize * 0.45;
//       }
//     };

//     pdf.setFontSize(22);
//     pdf.setFont('helvetica', 'bold');
//     const titleLines = pdf.splitTextToSize(chat.session_name, maxWidth);
//     for (const line of titleLines) {
//       pdf.text(line, margin, y);
//       y += 9;
//     }
//     y += 2;
    
//     pdf.setFontSize(10);
//     pdf.setFont('helvetica', 'normal');
//     pdf.setTextColor(120);
//     pdf.text(`Video ID: ${chat.youtube_id}`, margin, y);
//     pdf.setTextColor(0);
//     y += 12;

//     pdf.setDrawColor(200);
//     pdf.line(margin, y, pageWidth - margin, y);
//     y += 10;

//     const lines = chat.notes.split('\n');
    
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i];
      
//       if (!line.trim()) {
//         y += 3;
//         continue;
//       }

//       const cleanText = (text: string) => {
//         return text
//           .replace(/\*\*(.*?)\*\*/g, '$1')
//           .replace(/\*(.*?)\*/g, '$1')
//           .replace(/`(.*?)`/g, '$1')
//           .replace(/\[(.*?)\]\(.*?\)/g, '$1')
//           .trim();
//       };

//       if (line.startsWith('# ')) {
//         checkPage(15);
//         y += 6;
//         addText(cleanText(line.replace('# ', '')), 18, true);
//         y += 4;
//       } else if (line.startsWith('## ')) {
//         checkPage(12);
//         y += 5;
//         addText(cleanText(line.replace('## ', '')), 14, true);
//         y += 3;
//       } else if (line.startsWith('### ')) {
//         checkPage(10);
//         y += 4;
//         addText(cleanText(line.replace('### ', '')), 12, true);
//         y += 2;
//       } else if (line.startsWith('#### ')) {
//         checkPage(10);
//         y += 3;
//         addText(cleanText(line.replace('#### ', '')), 11, true);
//         y += 2;
//       } else if (line.startsWith('---')) {
//         checkPage(10);
//         y += 4;
//         pdf.setDrawColor(220);
//         pdf.line(margin, y, pageWidth - margin, y);
//         y += 6;
//       } else if (line.match(/^[\s]*[-*•]\s/)) {
//         checkPage(8);
//         const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2;
//         const text = cleanText(line.replace(/^[\s]*[-*•]\s/, ''));
//         pdf.setFontSize(10);
//         pdf.setFont('helvetica', 'normal');
//         pdf.text('•', margin + (indent * 5), y);
//         const bulletLines = pdf.splitTextToSize(text, maxWidth - 8 - (indent * 5));
//         for (let j = 0; j < bulletLines.length; j++) {
//           if (j > 0) checkPage(5);
//           pdf.text(bulletLines[j], margin + 6 + (indent * 5), y);
//           y += 5;
//         }
//       } else if (line.match(/^\d+\.\s/)) {
//         checkPage(8);
//         const num = line.match(/^(\d+)\./)?.[1] || '1';
//         const text = cleanText(line.replace(/^\d+\.\s/, ''));
//         pdf.setFontSize(10);
//         pdf.setFont('helvetica', 'normal');
//         pdf.text(`${num}.`, margin, y);
//         const numLines = pdf.splitTextToSize(text, maxWidth - 10);
//         for (let j = 0; j < numLines.length; j++) {
//           if (j > 0) checkPage(5);
//           pdf.text(numLines[j], margin + 8, y);
//           y += 5;
//         }
//       } else {
//         checkPage(8);
//         addText(cleanText(line), 10, false);
//         y += 1;
//       }
//     }

//     const filename = chat.session_name
//       .replace(/[^a-z0-9\s]/gi, '')
//       .replace(/\s+/g, '_')
//       .substring(0, 50) || 'notes';
    
//     pdf.save(`${filename}.pdf`);
//   };

//   return (
//     <div className="flex-1 flex flex-col h-screen bg-void-950">
//       {/* Header */}
//       <header className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] glass-darker">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <button
//               onClick={onToggleSidebar}
//               className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] text-void-400"
//             >
//               <MenuIcon size={20} />
//             </button>
//             <div>
//               <h1 className="font-display font-semibold text-lg text-white truncate max-w-md">
//                 {chat.session_name}
//               </h1>
//               <p className="text-xs text-void-500 mt-0.5">
//                 Video ID: {chat.youtube_id}
//               </p>
//             </div>
//           </div>
          
//           {/* Tabs */}
//           <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
//             {[
//               { id: 'notes', label: 'Notes', icon: SparklesIcon },
//               { id: 'chat', label: 'Chat', icon: SendIcon },
//               { id: 'flashcards', label: 'Study', icon: BookOpen },
//               { id: 'transcript', label: 'Transcript', icon: FileTextIcon },
//             ].map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id as typeof activeTab)}
//                 className={clsx(
//                   'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
//                   activeTab === tab.id
//                     ? 'bg-ember-500/20 text-ember-300'
//                     : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
//                 )}
//               >
//                 <tab.icon size={16} />
//                 <span className="hidden sm:inline">{tab.label}</span>
//               </button>
//             ))}
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Video Panel */}
//         <div 
//           className={clsx(
//             "hidden xl:flex flex-col flex-shrink-0 border-r border-white/[0.06] transition-all duration-300",
//             isVideoExpanded ? "w-[600px]" : "w-96"
//           )}
//         >
//           <div className="p-4 flex-1 flex flex-col">
//             <div className="relative group flex-1">
//               <div className="rounded-xl overflow-hidden bg-black shadow-2xl h-full">
//                 <iframe
//                   src={`https://www.youtube.com/embed/${chat.youtube_id}`}
//                   title="YouTube video"
//                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                   allowFullScreen
//                   className="w-full h-full min-h-[200px]"
//                   style={{ aspectRatio: isVideoExpanded ? '16/9' : 'auto' }}
//                 />
//               </div>
              
//               <button
//                 onClick={() => setIsVideoExpanded(!isVideoExpanded)}
//                 className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
//                 title={isVideoExpanded ? "Collapse video" : "Expand video"}
//               >
//                 {isVideoExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
//               </button>
//             </div>
            
//             <p className="text-xs text-void-500 mt-3 text-center">
//               {chat.youtube_transcript.split(/\s+/).length.toLocaleString()} words • {messages.length} messages
//             </p>
//           </div>
//         </div>

//         {/* Content area */}
//         <div className="flex-1 flex flex-col min-w-0">
//           {activeTab === 'notes' && (
//             <div className="flex-1 overflow-y-auto p-6">
//               <div className="max-w-3xl mx-auto">
//                 <div className="flex items-center justify-between gap-3 mb-6">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 rounded-lg bg-ember-500/20">
//                       <SparklesIcon size={20} className="text-ember-400" />
//                     </div>
//                     <h2 className="font-display font-semibold text-xl text-white">AI Analysis</h2>
//                   </div>
//                   <Button onClick={handleExportPDF} variant="ghost" size="sm">
//                     <DownloadIcon size={16} />
//                     Export
//                   </Button>
//                 </div>
//                 <div className="markdown-content prose prose-invert max-w-none">
//                   <ReactMarkdown>{chat.notes}</ReactMarkdown>
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === 'transcript' && (
//             <div className="flex-1 overflow-y-auto p-6">
//               <div className="max-w-3xl mx-auto">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="p-2 rounded-lg bg-azure-500/20">
//                     <FileTextIcon size={20} className="text-azure-400" />
//                   </div>
//                   <h2 className="font-display font-semibold text-xl text-white">Full Transcript</h2>
//                 </div>
//                 <div className="text-void-300 leading-relaxed whitespace-pre-wrap font-body">
//                   {chat.youtube_transcript}
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === 'flashcards' && (
//             <FlashcardsView chatId={chat.id} videoTitle={chat.session_name} />
//           )}

//           {activeTab === 'chat' && (
//             <>
//               <div className="flex-1 overflow-y-auto p-6">
//                 <div className="max-w-3xl mx-auto space-y-6">
//                   {messages.length === 0 && (
//                     <div className="text-center py-16">
//                       <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ember-500/10 to-ember-600/10 border border-ember-500/20 flex items-center justify-center">
//                         <SparklesIcon size={36} className="text-ember-400" />
//                       </div>
//                       <h3 className="text-xl font-display font-semibold text-white mb-2">
//                         Ask anything about this video
//                       </h3>
//                       <p className="text-void-400 max-w-md mx-auto">
//                         I've analyzed the transcript and I'm ready to answer your questions, 
//                         provide summaries, or dive deeper into any topic.
//                       </p>
                      
//                       <div className="mt-8 flex flex-wrap justify-center gap-2">
//                         {[
//                           'What are the main takeaways?',
//                           'Summarize in 3 bullet points',
//                           'What was the conclusion?',
//                         ].map((suggestion) => (
//                           <button
//                             key={suggestion}
//                             onClick={() => setInput(suggestion)}
//                             className="px-4 py-2 rounded-full text-sm text-void-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
//                           >
//                             {suggestion}
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {messages.map((message) => (
//                     <div key={message.id} className="space-y-4 animate-fade-in">
//                       <div className="flex gap-4">
//                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-azure-500/20 flex items-center justify-center">
//                           <UserIcon size={18} className="text-azure-400" />
//                         </div>
//                         <div className="flex-1 pt-2">
//                           <p className="text-void-100">{message.input}</p>
//                         </div>
//                       </div>
                      
//                       <div className="flex gap-4">
//                         <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
//                           <SparklesIcon size={18} className="text-ember-400" />
//                         </div>
//                         <div className="flex-1 pt-2">
//                           <div className="markdown-content">
//                             <ReactMarkdown>{message.output}</ReactMarkdown>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}

//                   {isSending && (
//                     <div className="flex gap-4 animate-fade-in">
//                       <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
//                         <SparklesIcon size={18} className="text-ember-400" />
//                       </div>
//                       <div className="flex-1 pt-2">
//                         <div className="typing-indicator">
//                           <span />
//                           <span />
//                           <span />
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   <div ref={messagesEndRef} />
//                 </div>
//               </div>

//               <div className="flex-shrink-0 p-6 border-t border-white/[0.06] glass-darker">
//                 <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
//                   <div className="flex items-center gap-3">
//                     <div className="flex-1 relative">
//                       <textarea
//                         ref={inputRef}
//                         value={input}
//                         onChange={(e) => setInput(e.target.value)}
//                         onKeyDown={handleKeyDown}
//                         placeholder="Ask a question about the video..."
//                         rows={1}
//                         className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-void-100 placeholder:text-void-500 resize-none transition-all focus:outline-none focus:border-ember-500/50 focus:bg-white/[0.05] hover:border-white/[0.15]"
//                         style={{ minHeight: '56px', maxHeight: '200px' }}
//                       />
//                     </div>
//                     <Button
//                       type="submit"
//                       variant="primary"
//                       size="sm"
//                       disabled={!input.trim() || isSending}
//                       className="!rounded-xl !p-4 flex-shrink-0 mb-1"
//                     >
//                       {isSending ? (
//                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                       ) : (
//                         <SendIcon size={20} />
//                       )}
//                     </Button>
//                   </div>
//                 </form>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }




'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { Chat, Message } from '@/types';
import { SendIcon, SparklesIcon, UserIcon, FileTextIcon, MenuIcon } from './Icons';
import Button from './Button';
import FlashcardsView from './FlashcardsView';
import QuizView from './QuizView';
import clsx from 'clsx';
import { DownloadIcon, Maximize2, Minimize2, BookOpen, Trophy } from 'lucide-react';

interface ChatViewProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (input: string) => Promise<void>;
  onToggleSidebar: () => void;
  isSending: boolean;
}

export default function ChatView({
  chat,
  messages,
  onSendMessage,
  onToggleSidebar,
  isSending,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'flashcards' | 'quiz' | 'transcript'>('notes');
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    
    const message = input;
    setInput('');
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPage = (needed: number) => {
      if (y + needed > 280) {
        pdf.addPage();
        y = 20;
      }
    };

    const addText = (text: string, fontSize: number, isBold = false, indent = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, maxWidth - indent);
      for (const line of lines) {
        checkPage(fontSize * 0.5);
        pdf.text(line, margin + indent, y);
        y += fontSize * 0.45;
      }
    };

    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(chat.session_name, maxWidth);
    for (const line of titleLines) {
      pdf.text(line, margin, y);
      y += 9;
    }
    y += 2;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text(`Video ID: ${chat.youtube_id}`, margin, y);
    pdf.setTextColor(0);
    y += 12;

    pdf.setDrawColor(200);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    const lines = chat.notes.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line.trim()) {
        y += 3;
        continue;
      }

      const cleanText = (text: string) => {
        return text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim();
      };

      if (line.startsWith('# ')) {
        checkPage(15);
        y += 6;
        addText(cleanText(line.replace('# ', '')), 18, true);
        y += 4;
      } else if (line.startsWith('## ')) {
        checkPage(12);
        y += 5;
        addText(cleanText(line.replace('## ', '')), 14, true);
        y += 3;
      } else if (line.startsWith('### ')) {
        checkPage(10);
        y += 4;
        addText(cleanText(line.replace('### ', '')), 12, true);
        y += 2;
      } else if (line.startsWith('#### ')) {
        checkPage(10);
        y += 3;
        addText(cleanText(line.replace('#### ', '')), 11, true);
        y += 2;
      } else if (line.startsWith('---')) {
        checkPage(10);
        y += 4;
        pdf.setDrawColor(220);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;
      } else if (line.match(/^[\s]*[-*•]\s/)) {
        checkPage(8);
        const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2;
        const text = cleanText(line.replace(/^[\s]*[-*•]\s/, ''));
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('•', margin + (indent * 5), y);
        const bulletLines = pdf.splitTextToSize(text, maxWidth - 8 - (indent * 5));
        for (let j = 0; j < bulletLines.length; j++) {
          if (j > 0) checkPage(5);
          pdf.text(bulletLines[j], margin + 6 + (indent * 5), y);
          y += 5;
        }
      } else if (line.match(/^\d+\.\s/)) {
        checkPage(8);
        const num = line.match(/^(\d+)\./)?.[1] || '1';
        const text = cleanText(line.replace(/^\d+\.\s/, ''));
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${num}.`, margin, y);
        const numLines = pdf.splitTextToSize(text, maxWidth - 10);
        for (let j = 0; j < numLines.length; j++) {
          if (j > 0) checkPage(5);
          pdf.text(numLines[j], margin + 8, y);
          y += 5;
        }
      } else {
        checkPage(8);
        addText(cleanText(line), 10, false);
        y += 1;
      }
    }

    const filename = chat.session_name
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 50) || 'notes';
    
    pdf.save(`${filename}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-void-950">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] glass-darker">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] text-void-400"
            >
              <MenuIcon size={20} />
            </button>
            <div>
              <h1 className="font-display font-semibold text-lg text-white truncate max-w-md">
                {chat.session_name}
              </h1>
              <p className="text-xs text-void-500 mt-0.5">
                Video ID: {chat.youtube_id}
              </p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { id: 'notes', label: 'Notes', icon: SparklesIcon },
              { id: 'chat', label: 'Chat', icon: SendIcon },
              { id: 'flashcards', label: 'Study', icon: BookOpen },
              { id: 'quiz', label: 'Quiz', icon: Trophy },
              { id: 'transcript', label: 'Transcript', icon: FileTextIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-ember-500/20 text-ember-300'
                    : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
                )}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Panel */}
        <div 
          className={clsx(
            "hidden xl:flex flex-col flex-shrink-0 border-r border-white/[0.06] transition-all duration-300",
            isVideoExpanded ? "w-[600px]" : "w-96"
          )}
        >
          <div className="p-4 flex-1 flex flex-col">
            <div className="relative group flex-1">
              <div className="rounded-xl overflow-hidden bg-black shadow-2xl h-full">
                <iframe
                  src={`https://www.youtube.com/embed/${chat.youtube_id}`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full min-h-[200px]"
                  style={{ aspectRatio: isVideoExpanded ? '16/9' : 'auto' }}
                />
              </div>
              
              <button
                onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                title={isVideoExpanded ? "Collapse video" : "Expand video"}
              >
                {isVideoExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
            
            <p className="text-xs text-void-500 mt-3 text-center">
              {chat.youtube_transcript.split(/\s+/).length.toLocaleString()} words • {messages.length} messages
            </p>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-ember-500/20">
                      <SparklesIcon size={20} className="text-ember-400" />
                    </div>
                    <h2 className="font-display font-semibold text-xl text-white">AI Analysis</h2>
                  </div>
                  <Button onClick={handleExportPDF} variant="ghost" size="sm">
                    <DownloadIcon size={16} />
                    Export
                  </Button>
                </div>
                <div className="markdown-content prose prose-invert max-w-none">
                  <ReactMarkdown>{chat.notes}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-azure-500/20">
                    <FileTextIcon size={20} className="text-azure-400" />
                  </div>
                  <h2 className="font-display font-semibold text-xl text-white">Full Transcript</h2>
                </div>
                <div className="text-void-300 leading-relaxed whitespace-pre-wrap font-body">
                  {chat.youtube_transcript}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView chatId={chat.id} videoTitle={chat.session_name} />
          )}

          {activeTab === 'quiz' && (
            <QuizView chatId={chat.id} videoTitle={chat.session_name} />
          )}

          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ember-500/10 to-ember-600/10 border border-ember-500/20 flex items-center justify-center">
                        <SparklesIcon size={36} className="text-ember-400" />
                      </div>
                      <h3 className="text-xl font-display font-semibold text-white mb-2">
                        Ask anything about this video
                      </h3>
                      <p className="text-void-400 max-w-md mx-auto">
                        I've analyzed the transcript and I'm ready to answer your questions, 
                        provide summaries, or dive deeper into any topic.
                      </p>
                      
                      <div className="mt-8 flex flex-wrap justify-center gap-2">
                        {[
                          'What are the main takeaways?',
                          'Summarize in 3 bullet points',
                          'What was the conclusion?',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="px-4 py-2 rounded-full text-sm text-void-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div key={message.id} className="space-y-4 animate-fade-in">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-azure-500/20 flex items-center justify-center">
                          <UserIcon size={18} className="text-azure-400" />
                        </div>
                        <div className="flex-1 pt-2">
                          <p className="text-void-100">{message.input}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
                          <SparklesIcon size={18} className="text-ember-400" />
                        </div>
                        <div className="flex-1 pt-2">
                          <div className="markdown-content">
                            <ReactMarkdown>{message.output}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex gap-4 animate-fade-in">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
                        <SparklesIcon size={18} className="text-ember-400" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="typing-indicator">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="flex-shrink-0 p-6 border-t border-white/[0.06] glass-darker">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about the video..."
                        rows={1}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-void-100 placeholder:text-void-500 resize-none transition-all focus:outline-none focus:border-ember-500/50 focus:bg-white/[0.05] hover:border-white/[0.15]"
                        style={{ minHeight: '56px', maxHeight: '200px' }}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!input.trim() || isSending}
                      className="!rounded-xl !p-4 flex-shrink-0 mb-1"
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <SendIcon size={20} />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
