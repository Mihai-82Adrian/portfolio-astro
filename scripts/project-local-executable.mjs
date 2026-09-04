import { execFileSync } from 'node:child_process';
import { realpathSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

export function execProjectLocalBin(projectRoot, packageName, binName, args, options = {}) {
  const root = path.resolve(projectRoot);
  let nodeModules;
  let manifest;
  try {
    nodeModules = realpathSync(path.join(root, 'node_modules'));
    manifest = realpathSync(createRequire(path.join(root, 'package.json')).resolve(`${packageName}/package.json`));
  } catch (error) {
    throw new Error(`Missing project-local package: ${packageName}`, { cause: error });
  }

  const packageRoot = path.dirname(manifest);
  if (!isInside(nodeModules, packageRoot)) {
    throw new Error(`Resolved package is not project-local: ${packageName}`);
  }

  const packageJson = JSON.parse(readFileSync(manifest, 'utf8'));
  const relativeBin = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.[binName];
  let executable;
  try {
    if (typeof relativeBin !== 'string' || path.isAbsolute(relativeBin)) throw new Error('invalid bin');
    executable = realpathSync(path.resolve(packageRoot, relativeBin));
  } catch (error) {
    throw new Error(`Missing project-local executable: ${binName} from ${packageName}`, { cause: error });
  }
  if (!isInside(packageRoot, executable)) {
    throw new Error(`Project-local executable escapes its package: ${binName} from ${packageName}`);
  }

  return execFileSync(process.execPath, [executable, ...args], options);
}
