// 'use client';

// import React from 'react';
// import { SparklesIcon, YoutubeIcon, BrainIcon, MessageIcon } from './Icons';
// import Button from './Button';

// interface EmptyStateProps {
//   onNewChat: () => void;
// }

// export default function EmptyState({ onNewChat }: EmptyStateProps) {
//   return (
//     <div className="flex-1 flex items-center justify-center p-8">
//       <div className="max-w-2xl text-center">
//         {/* Animated hero icon */}
//         <div className="relative w-32 h-32 mx-auto mb-8">
//           {/* Glow effect */}
//           <div className="absolute inset-0 bg-ember-500/20 blur-3xl rounded-full animate-pulse-slow" />
          
//           {/* Main icon container */}
//           <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-ember-500/20 via-ember-600/10 to-transparent border border-ember-500/20 flex items-center justify-center animate-float">
//             <SparklesIcon size={48} className="text-ember-400" />
//           </div>
          
//           {/* Orbiting elements */}
//           <div className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-azure-500/20 border border-azure-500/20 flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
//             <YoutubeIcon size={18} className="text-azure-400" />
//           </div>
//           <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
//             <BrainIcon size={18} className="text-emerald-400" />
//           </div>
//         </div>

//         <h1 className="text-4xl font-display font-bold mb-4">
//           <span className="text-white">Welcome to </span>
//           <span className="gradient-text">Lumina</span>
//         </h1>
        
//         <p className="text-lg text-void-400 mb-8 max-w-md mx-auto leading-relaxed">
//           Transform any YouTube video into an interactive experience with intelligent insights. 
//           Get detailed analysis, notes, and have conversations about the content while you watch.
//         </p>

//         <Button
//           onClick={onNewChat}
//           variant="primary"
//           size="lg"
//           className="mx-auto"
//         >
//           <SparklesIcon size={20} />
//           Analyze Your Video
//         </Button>

//         {/* Features grid */}
//         <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
//           {[
//             {
//               icon: YoutubeIcon,
//               title: 'Any YouTube Video',
//               description: 'Just paste a link and we handle the rest',
//               color: 'ember',
//             },
//             {
//               icon: BrainIcon,
//               title: 'AI Analysis',
//               description: 'Get comprehensive notes and key insights',
//               color: 'azure',
//             },
//             {
//               icon: MessageIcon,
//               title: 'Interactive Chat',
//               description: 'Ask questions and get instant answers while you watch',
//               color: 'emerald',
//             },
//           ].map((feature) => (
//             <div
//               key={feature.title}
//               className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group"
//             >
//               <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
//                 <feature.icon size={24} className={`text-${feature.color}-400`} />
//               </div>
//               <h3 className="font-display font-semibold text-white mb-2">
//                 {feature.title}
//               </h3>
//               <p className="text-sm text-void-400">
//                 {feature.description}
//               </p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }



'use client';

import React from 'react';
import { SparklesIcon, YoutubeIcon, BrainIcon, MessageIcon } from './Icons';
import Button from './Button';

interface EmptyStateProps {
  onNewChat: () => void;
}

export default function EmptyState({ onNewChat }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-2xl w-full text-center py-16 mt-8">
        {/* Animated hero icon */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-ember-500/20 blur-3xl rounded-full animate-pulse-slow" />
          
          {/* Main icon container */}
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-ember-500/20 via-ember-600/10 to-transparent border border-ember-500/20 flex items-center justify-center animate-float">
            <SparklesIcon size={48} className="text-ember-400" />
          </div>
          
          {/* Orbiting elements */}
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-azure-500/20 border border-azure-500/20 flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <YoutubeIcon size={18} className="text-azure-400" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <BrainIcon size={18} className="text-emerald-400" />
          </div>
        </div>

        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">Welcome to </span>
          <span className="gradient-text">Lumina</span>
        </h1>
        
        <p className="text-lg text-void-400 mb-8 max-w-md mx-auto leading-relaxed">
          Transform any YouTube video into an interactive learning experience with intelligent insights. 
          Get detailed analysis, notes, and have conversations about the content or generate flashcards and quizzes to reinforce your learning while you watch.
        </p>

        <Button
          onClick={onNewChat}
          variant="primary"
          size="lg"
          className="mx-auto"
        >
          <SparklesIcon size={20} />
          Analyze Your Video
        </Button>

        {/* Features grid - Fixed */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
          {[
            {
              icon: YoutubeIcon,
              title: 'Any YouTube Video',
              description: 'Just paste a link',
              colorClass: 'bg-ember-500/10 text-ember-400',
            },
            {
              icon: BrainIcon,
              title: 'Detailed Analysis',
              description: 'Get comprehensive notes and key insights',
              colorClass: 'bg-azure-500/10 text-azure-400',
            },
            {
              icon: MessageIcon,
              title: 'Interactive Experience',
              description: 'Ask questions and get instant answers while you watch',
              colorClass: 'bg-emerald-500/10 text-emerald-400',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${feature.colorClass.split(' ')[0]} flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform`}>
                <feature.icon size={20} className={feature.colorClass.split(' ')[1]} />
              </div>
              <h3 className="font-display font-semibold text-white text-sm mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-void-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
