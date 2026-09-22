import {build} from 'esbuild';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url));
// A classic, self-contained script also runs from file:// without module CORS.
const result=await build({
  absWorkingDir:root,
  entryPoints:['app.js'],
  bundle:true,
  format:'iife',
  platform:'browser',
  target:['es2020'],
  charset:'utf8',
  write:false,
  legalComments:'none',
});
const javascript=result.outputFiles[0].text;
await writeFile(new URL('./game.js',import.meta.url),javascript);
const [html,css,icon]=await Promise.all([
  readFile(new URL('./index.html',import.meta.url),'utf8'),
  readFile(new URL('./style.css',import.meta.url),'utf8'),
  readFile(new URL('./icon.svg',import.meta.url)),
]);
const standalone=html
  .replace(/<link rel="icon"[^>]+>/,`<link rel="icon" href="data:image/svg+xml;base64,${icon.toString('base64')}" type="image/svg+xml">`)
  .replace(/<link rel="stylesheet"[^>]+>/,()=>`<style>${css}</style>`)
  .replace(/<script src="\.\/game\.js" defer><\/script>/,()=>`<script>${javascript.replace(/<\/script/gi,'<\\/script')}</script>`);
await writeFile(new URL('../符文远征-双击即玩.html',import.meta.url),standalone);
console.log('Built game.js and the standalone offline HTML.');
