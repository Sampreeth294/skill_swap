/**
 * Normalises skill names so "React.js", "ReactJS" and "react" all match.
 */
const ALIASES = {
  reactjs: 'react', 'react js': 'react', 'react.js': 'react',
  js: 'javascript', 'java script': 'javascript', es6: 'javascript',
  ts: 'typescript',
  'node': 'node.js', nodejs: 'node.js', 'node js': 'node.js',
  py: 'python', python3: 'python',
  ml: 'machine learning',
  ui: 'ui design', ux: 'ux design', 'ui/ux': 'ui/ux design',
  'c plus plus': 'c++', cpp: 'c++',
  golang: 'go',
  mongo: 'mongodb',
  postgres: 'postgresql',
  'vue': 'vue.js', vuejs: 'vue.js',
  'excel': 'microsoft excel',
};

export function normalizeSkill(name = '') {
  const base = String(name).toLowerCase().trim().replace(/\s+/g, ' ');
  return ALIASES[base] || base;
}
