import React, { useState, useEffect } from 'react';

const codeSnippets = {
  Dashboard: `// Initializing Dashboard Environment...
import { syncCareerGraph } from '@engine/core';
import { fetchTelemetry } from '@api/metrics';

const initDashboard = async () => {
  console.log("Loading career trajectory modules...");
  await syncCareerGraph({ optimize: true });
  console.log("Telemetry synchronized. Ready.");
};

initDashboard();`,
  Interview: `// Booting up Adaptive AI Interview Engine...
import { loadModel } from '@ml/adaptive-engine';
import { prepareContext } from '@api/interview';

async function startSession() {
  const model = await loadModel('gemini-pro');
  console.log("Calibrating behavioral weights...");
  model.setTemperature(0.7);
  return "System Ready.";
}

startSession();`,
  Competency: `// Validating Competency Matrix...
import { evaluateSkills } from '@core/skills';
import { renderRadar } from '@ui/charts';

function validate() {
  console.log("Scanning proficiency levels...");
  const matrix = evaluateSkills();
  console.log("Generating insights...");
  renderRadar(matrix);
}

validate();`,
  ProfileSetup: `// Constructing User Profile Schema...
import { parseResume } from '@ml/parser';
import { buildKnowledgeGraph } from '@core/graph';

async function setupProfile(resumeFile) {
  console.log("Extracting entities...");
  const data = await parseResume(resumeFile);
  console.log("Structuring knowledge graph...");
  return buildKnowledgeGraph(data);
}

setupProfile();`,
  CareerIntelligence: `// Activating Career Intelligence Oracle...
import { predictTrends } from '@ai/forecasting';
import { aggregateMarketData } from '@api/market';

const generateInsights = async () => {
  console.log("Aggregating labor market data...");
  const data = await aggregateMarketData();
  console.log("Running predictive models...");
  return predictTrends(data);
};

generateInsights();`,
  Default: `// Loading module...
import { initializeSystem } from '@core/system';

async function boot() {
  console.log("Allocating resources...");
  await initializeSystem();
  console.log("Ready.");
}

boot();`
};

export default function CodeLoadingScreen({ pageName = 'Default' }) {
  const snippet = codeSnippets[pageName] || codeSnippets.Default;
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < snippet.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + snippet[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, Math.random() * 20 + 15); // typing speed
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, snippet]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', width: '100%', padding: '20px' }}>
      <div style={{ 
        background: '#0f172a', 
        borderRadius: '12px', 
        padding: '24px', 
        width: '100%', 
        maxWidth: '600px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #1e293b',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Terminal Header */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            {pageName.toLowerCase()}_init.js
          </span>
        </div>
        
        {/* Code Content */}
        <pre style={{ 
          margin: 0, 
          fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, Monaco, monospace", 
          fontSize: '0.9rem',
          lineHeight: '1.6',
          color: '#38bdf8',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textAlign: 'left'
        }}>
          <code>
            {displayedText}
            <span style={{ 
              display: 'inline-block',
              width: '8px',
              height: '1.1em',
              background: '#38bdf8',
              marginLeft: '4px',
              verticalAlign: 'bottom',
              animation: 'code-cursor-blink 1s step-end infinite'
            }} />
          </code>
        </pre>
        <style>
          {\`
            @keyframes code-cursor-blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          \`}
        </style>
      </div>
    </div>
  );
}
