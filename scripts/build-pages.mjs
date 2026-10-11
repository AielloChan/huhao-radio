import './build.mjs';
import {cp, rm, writeFile} from 'node:fs/promises';

const output = new URL('../docs/', import.meta.url);
await rm(output, {recursive:true, force:true});
await cp(new URL('../dist/', import.meta.url), output, {recursive:true});
await rm(new URL('_headers', output));
await writeFile(new URL('.nojekyll', output), '');
console.log('GitHub Pages publication files generated in docs/');
